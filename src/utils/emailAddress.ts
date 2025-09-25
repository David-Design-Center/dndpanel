export interface ParsedAddress {
  name: string;
  email: string;
}

export function parseEmailAddress(raw: string | undefined | null): ParsedAddress | null {
  if (!raw) return null;
  const decoded = raw.replace(/^\s+|\s+$/g, '');
  const match = decoded.match(/^"?([^"<]*)"?\s*(?:<([^>]+)>)?$/);
  if (match) {
    const name = match[1]?.trim() || '';
    const email = match[2]?.trim() || '';
    return {
      name,
      email: email || (!name ? decoded : ''),
    };
  }
  return {
    name: '',
    email: decoded,
  };
}

export function formatDisplayName(address: ParsedAddress | null): string {
  if (!address) return '';
  const name = address.name.replace(/^"|"$/g, '').trim();
  const email = address.email.replace(/^"|"$/g, '').trim();

  if (name && email) {
    if (name.toLowerCase() === email.toLowerCase()) {
      return email;
    }
    return name;
  }
  if (name) return name;
  if (email) {
    const localPart = email.split('@')[0];
    return localPart || email;
  }
  return '';
}
