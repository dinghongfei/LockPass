import type {
  PasswordGeneratorOptions,
} from "@/lib/types";

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SPECIAL = "!@#$%^&*()-_=+[]{}|;:,.<>?";
const AMBIGUOUS = new Set(["0", "O", "o", "I", "l", "1", "|"]);

function filterAmbiguous(chars: string): string {
  return chars
    .split("")
    .filter((c) => !AMBIGUOUS.has(c))
    .join("");
}

function buildCharset(options: PasswordGeneratorOptions): string {
  let charset = "";
  if (options.includeUppercase) {
    charset += options.excludeAmbiguous
      ? filterAmbiguous(UPPERCASE)
      : UPPERCASE;
  }
  if (options.includeLowercase) {
    charset += options.excludeAmbiguous
      ? filterAmbiguous(LOWERCASE)
      : LOWERCASE;
  }
  if (options.includeNumbers) {
    charset += options.excludeAmbiguous
      ? filterAmbiguous(NUMBERS)
      : NUMBERS;
  }
  if (options.includeSpecial) {
    charset += options.excludeAmbiguous
      ? filterAmbiguous(SPECIAL)
      : SPECIAL;
  }
  return charset;
}

function pickRandom(charset: string): string {
  const index = Math.floor(Math.random() * charset.length);
  return charset[index];
}

function shuffle(arr: string[]): string[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function validateOptions(options: PasswordGeneratorOptions): string | null {
  const charset = buildCharset(options);
  if (!charset) return "至少选择一种字符类型";

  const minRequired =
    (options.includeNumbers ? options.minNumbers : 0) +
    (options.includeSpecial ? options.minSpecialChars : 0);

  if (options.length < minRequired) {
    return `密码长度不能小于最小字符数要求 (${minRequired})`;
  }

  if (options.includeNumbers) {
    const numCharset = options.excludeAmbiguous
      ? filterAmbiguous(NUMBERS)
      : NUMBERS;
    if (numCharset.length < options.minNumbers) {
      return "可用数字字符不足以满足最小数量要求";
    }
  }

  if (options.includeSpecial) {
    const specCharset = options.excludeAmbiguous
      ? filterAmbiguous(SPECIAL)
      : SPECIAL;
    if (specCharset.length < options.minSpecialChars) {
      return "可用特殊符号不足以满足最小数量要求";
    }
  }

  return null;
}

export function generatePassword(
  options: PasswordGeneratorOptions
): string {
  const error = validateOptions(options);
  if (error) throw new Error(error);

  const charset = buildCharset(options);
  const numCharset = options.excludeAmbiguous
    ? filterAmbiguous(NUMBERS)
    : NUMBERS;
  const specCharset = options.excludeAmbiguous
    ? filterAmbiguous(SPECIAL)
    : SPECIAL;
  const upperCharset = options.excludeAmbiguous
    ? filterAmbiguous(UPPERCASE)
    : UPPERCASE;
  const lowerCharset = options.excludeAmbiguous
    ? filterAmbiguous(LOWERCASE)
    : LOWERCASE;

  const chars: string[] = [];

  if (options.includeNumbers) {
    for (let i = 0; i < options.minNumbers; i++) {
      chars.push(pickRandom(numCharset));
    }
  }

  if (options.includeSpecial) {
    for (let i = 0; i < options.minSpecialChars; i++) {
      chars.push(pickRandom(specCharset));
    }
  }

  if (options.includeUppercase && chars.length < options.length) {
    chars.push(pickRandom(upperCharset));
  }
  if (options.includeLowercase && chars.length < options.length) {
    chars.push(pickRandom(lowerCharset));
  }

  while (chars.length < options.length) {
    chars.push(pickRandom(charset));
  }

  return shuffle(chars.slice(0, options.length)).join("");
}
