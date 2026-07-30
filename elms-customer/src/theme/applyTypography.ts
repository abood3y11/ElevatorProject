import { Text, TextInput } from "react-native";
import { typography } from "./typography";

let applied = false;

export function applyTypographyDefaults() {
  if (applied) {
    return;
  }

  const TextComponent = Text as unknown as {
    defaultProps?: { style?: unknown };
  };
  const textProps = TextComponent.defaultProps ?? {};
  TextComponent.defaultProps = {
    ...textProps,
    style: [{ fontFamily: typography.regular }, textProps.style],
  };

  const TextInputComponent = TextInput as unknown as {
    defaultProps?: { style?: unknown };
  };
  const inputProps = TextInputComponent.defaultProps ?? {};
  TextInputComponent.defaultProps = {
    ...inputProps,
    style: [{ fontFamily: typography.regular }, inputProps.style],
  };

  applied = true;
}
