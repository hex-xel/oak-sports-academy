/**
 * @file apps/mobile/features/registration/components/RegistrationTextField.tsx
 * Registration skin for the shared {@link TextField}.
 *
 * The approved login screen uses the lighter neutral input border; the registration
 * sticker sheet uses the gray-green #B9C1BD border. This wrapper applies only the border
 * token so focus, error, password-toggle and accessibility behaviour stay in one place.
 */

import React from "react";
import { TextField } from "../../../components/TextField";
import type { TextFieldProps } from "../../../components/TextField";
import { RegistrationColors } from "../../../constants/theme";

/**
 * TextField pre-styled with the registration border colour.
 *
 * @param props - Every TextField prop, forwarded unchanged.
 * @returns The shared text field with the registration border token.
 */
export const RegistrationTextField: React.FC<TextFieldProps> = (props) => (
  <TextField {...props} borderColor={RegistrationColors.fieldBorder} />
);
