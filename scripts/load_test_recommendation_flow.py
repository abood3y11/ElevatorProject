"""Sequential load/smoke test for the ELMS recommendation-to-order flow.

This script exercises the live API flow:

technician visit -> recommendation -> customer approval -> add to cart ->
place order -> admin marks invoice paid -> recommendation becomes done

It is intentionally practical rather than synthetic. It works best against a
staging/demo environment with available assigned work orders for the technician.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from dataclasses import dataclass
from typing import Any

import requests


TECH_PHONE = "0501111111"
TECH_PASSWORD = "tech123"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"


@dataclass
class FlowResult:
    iteration: int
    success: bool
    work_order_id: str | None = None
    recommendation_id: str | None = None
    order_id: str | None = None
    duration_seconds: float = 0.0
    error: str | None = None


class Api:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def post(self, path: str, **kwargs: Any) -> requests.Response:
        return requests.post(f"{self.base_url}{path}", timeout=40, **kwargs)

    def get(self, path: str, **kwargs: Any) -> requests.Response:
        return requests.get(f"{self.base_url}{path}", timeout=40, **kwargs)

    def put(self, path: str, **kwargs: Any) -> requests.Response:
        return requests.put(f"{self.base_url}{path}", timeout=40, **kwargs)


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def ensure_demo_admin(api: Api) -> str:
    api.post("/auth/register-demo")
    login = api.post("/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    login.raise_for_status()
    return login.json()["access_token"]


def create_customer_user(api: Api, admin_token: str, customer_id: str, iteration: int) -> tuple[str, str]:
    email = f"load-{iteration}-{uuid.uuid4().hex[:8]}@example.com"
    phone = "059" + str(uuid.uuid4().int)[-7:]
    response = api.post(
        f"/customer-admin/customers/{customer_id}/users",
        headers=bearer(admin_token),
        json={
            "fullName": f"عميل اختبار تحميل {iteration}",
            "email": email,
            "phone": phone,
            "password": "cust12345",
            "roles": ["customer"],
            "isActive": True,
        },
    )
    response.raise_for_status()
    return phone, email


def login_customer(api: Api, phone: str, password: str = "cust12345") -> str:
    response = api.post("/customer/account/login", json={"phone": phone, "password": password})
    response.raise_for_status()
    return response.json()["access_token"]


def login_technician(api: Api) -> str:
    response = api.post("/auth/login/tech", json={"phone": TECH_PHONE, "password": TECH_PASSWORD})
    response.raise_for_status()
    return response.json()["access_token"]


def get_first_assigned_task(api: Api, tech_token: str) -> dict[str, Any] | None:
    response = api.get("/work-orders/my-tasks", headers=bearer(tech_token))
    response.raise_for_status()
    tasks = response.json()
    return next((task for task in tasks if task["status"] == "assigned"), None)


def get_first_visible_recommendation_part(api: Api, tech_token: str) -> dict[str, Any]:
    response = api.get("/work-orders/recommendation-parts/options?limit=1", headers=bearer(tech_token))
    response.raise_for_status()
    items = response.json()
    if not items:
        raise RuntimeError("No customer-visible spare parts available for recommendation.")
    return items[0]


def ensure_customer_address(api: Api, customer_token: str, phone: str) -> str:
    response = api.get("/customer/account/addresses", headers=bearer(customer_token))
    response.raise_for_status()
    items = response.json()
    if items:
        return items[0]["id"]

    created = api.post(
        "/customer/account/addresses",
        headers=bearer(customer_token),
        json={
            "title": "الموقع الرئيسي",
            "receiverName": "عميل اختبار التحميل",
            "phone": phone,
            "line1": "العليا - الرياض",
            "area": "الرياض",
            "estimatedWindow": "09:00 ص - 05:00 م",
            "isDefault": True,
        },
    )
    created.raise_for_status()
    return created.json()["id"]


def run_iteration(api: Api, iteration: int, customer_id: str) -> FlowResult:
    started = time.perf_counter()
    result = FlowResult(iteration=iteration, success=False)

    try:
        admin_token = ensure_demo_admin(api)
        phone, _email = create_customer_user(api, admin_token, customer_id, iteration)
        tech_token = login_technician(api)

        task = get_first_assigned_task(api, tech_token)
        if task is None:
            raise RuntimeError("No assigned work order available for the technician.")
        work_order_id = task["id"]
        result.work_order_id = work_order_id

        part = get_first_visible_recommendation_part(api, tech_token)

        start_resp = api.post(f"/work-orders/{work_order_id}/start", headers=bearer(tech_token), json={"notes": f"load-test-{iteration}"})
        start_resp.raise_for_status()

        complete_resp = api.post(
            f"/work-orders/{work_order_id}/complete",
            headers=bearer(tech_token),
            json={
                "resolution_notes": "تمت الزيارة ضمن اختبار التحميل",
                "technician_notes": f"load-test-{iteration}",
                "recommendations": "يوصى بالشراء من المتجر",
                "customer_name_signed": f"عميل اختبار التحميل {iteration}",
                "recommended_spare_parts": [
                    {
                        "spare_part_id": part["id"],
                        "quantity_recommended": 1,
                        "reason": "اختبار حمل التوصية",
                        "urgency": "high",
                        "should_replace_now": True,
                    }
                ],
            },
        )
        complete_resp.raise_for_status()

        customer_token = login_customer(api, phone)
        visit_detail = api.get(f"/customer/visits/{work_order_id}", headers=bearer(customer_token))
        visit_detail.raise_for_status()
        recommended_parts = visit_detail.json().get("recommendedParts", [])
        if not recommended_parts:
            raise RuntimeError("No recommended parts found on customer visit detail.")

        recommendation_id = recommended_parts[0]["id"]
        result.recommendation_id = recommendation_id

        approve = api.post(
            f"/customer/visits/{work_order_id}/recommended-parts/{recommendation_id}/decision",
            headers=bearer(customer_token),
            json={"decision": "approved"},
        )
        approve.raise_for_status()

        add_to_cart = api.post(
            f"/customer/visits/{work_order_id}/recommended-parts/add-to-cart",
            headers=bearer(customer_token),
        )
        add_to_cart.raise_for_status()

        address_id = ensure_customer_address(api, customer_token, phone)

        place = api.post(
            "/customer/store/checkout/place-order",
            headers=bearer(customer_token),
            json={
                "useCart": True,
                "paymentMethod": "invoice",
                "addressId": address_id,
                "note": f"load-test-{iteration}",
            },
        )
        place.raise_for_status()
        order_id = place.json()["id"]
        result.order_id = order_id

        pay = api.put(
            f"/customer-admin/orders/{order_id}",
            headers=bearer(admin_token),
            json={"markInvoicePaid": True},
        )
        pay.raise_for_status()

        final_visit = api.get(f"/customer/visits/{work_order_id}", headers=bearer(customer_token))
        final_visit.raise_for_status()
        final_parts = final_visit.json().get("recommendedParts", [])
        final_status = final_parts[0]["customerActionStatus"] if final_parts else None
        if final_status != "done":
            raise RuntimeError(f"Recommendation expected 'done' but got {final_status!r}")

        result.success = True
        result.duration_seconds = round(time.perf_counter() - started, 2)
        return result
    except Exception as exc:  # noqa: BLE001
        result.error = str(exc)
        result.duration_seconds = round(time.perf_counter() - started, 2)
        return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Run ELMS recommendation flow load/smoke test.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000/api/v1", help="ELMS API base URL")
    parser.add_argument("--customer-id", required=True, help="Existing customer UUID to link created test users")
    parser.add_argument("--iterations", type=int, default=1, help="Number of sequential iterations")
    parser.add_argument("--delay-seconds", type=float, default=0.0, help="Delay between iterations")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON summary")
    args = parser.parse_args()

    api = Api(args.base_url)
    results: list[FlowResult] = []

    for index in range(1, args.iterations + 1):
        result = run_iteration(api, index, args.customer_id)
        results.append(result)
        if args.delay_seconds and index < args.iterations:
            time.sleep(args.delay_seconds)

    passed = sum(1 for item in results if item.success)
    failed = len(results) - passed
    total_duration = round(sum(item.duration_seconds for item in results), 2)

    payload = {
        "baseUrl": args.base_url,
        "iterations": args.iterations,
        "passed": passed,
        "failed": failed,
        "totalDurationSeconds": total_duration,
        "results": [item.__dict__ for item in results],
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(f"ELMS load/smoke test complete: {passed} passed, {failed} failed, total {total_duration}s")
        for item in results:
            status = "PASS" if item.success else "FAIL"
            print(
                f"[{status}] iteration={item.iteration} "
                f"work_order={item.work_order_id} recommendation={item.recommendation_id} "
                f"order={item.order_id} duration={item.duration_seconds}s"
            )
            if item.error:
                print(f"       error={item.error}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
