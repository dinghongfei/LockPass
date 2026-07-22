import {
  DEFAULT_PASSWORD_OPTIONS,
  PASSWORD_PREFIX_OPTIONS,
  type PasswordGeneratorOptions,
  type PasswordPrefix,
} from "@/lib/types";
import { generatePassword } from "@/lib/password-gen/generator";

export type OpenApiPasswordGenerateInput = Partial<PasswordGeneratorOptions> & {
  purpose: string;
  prefix?: PasswordPrefix | string;
};

export function resolvePasswordGenerateOptions(
  input: OpenApiPasswordGenerateInput
): PasswordGeneratorOptions & { prefix: string } {
  return {
    length: input.length ?? DEFAULT_PASSWORD_OPTIONS.length,
    includeUppercase:
      input.includeUppercase ?? DEFAULT_PASSWORD_OPTIONS.includeUppercase,
    includeLowercase:
      input.includeLowercase ?? DEFAULT_PASSWORD_OPTIONS.includeLowercase,
    includeNumbers:
      input.includeNumbers ?? DEFAULT_PASSWORD_OPTIONS.includeNumbers,
    includeSpecial:
      input.includeSpecial ?? DEFAULT_PASSWORD_OPTIONS.includeSpecial,
    minNumbers: input.minNumbers ?? DEFAULT_PASSWORD_OPTIONS.minNumbers,
    minSpecialChars:
      input.minSpecialChars ?? DEFAULT_PASSWORD_OPTIONS.minSpecialChars,
    excludeAmbiguous:
      input.excludeAmbiguous ?? DEFAULT_PASSWORD_OPTIONS.excludeAmbiguous,
    prefix: input.prefix ?? "",
  };
}

export function isAllowedPasswordPrefix(prefix: string): boolean {
  return (PASSWORD_PREFIX_OPTIONS as readonly string[]).includes(prefix);
}

export function generatePasswordWithPrefix(
  options: PasswordGeneratorOptions & { prefix: string }
): string {
  const { prefix, ...genOptions } = options;
  return `${prefix}${generatePassword(genOptions)}`;
}
