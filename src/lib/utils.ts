import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get initial letter for profile icon - use name if available, otherwise domain from email
 */
export function getProfileInitial(name: string, email: string): string {
  // If name exists and is not empty, use first letter of name
  if (name && name.trim()) {
    return name.trim().charAt(0).toUpperCase();
  }

  // If no name, extract domain and use first letter
  if (email && email.includes("@")) {
    const domain = email.split("@")[1];
    if (domain) {
      // Get the domain part before any dots (e.g., "gmail" from "gmail.com")
      const domainName = domain.split(".")[0];
      if (domainName && domainName.length > 0) {
        return domainName.charAt(0).toUpperCase();
      }
    }
  }

  // If email exists but no domain found, use first letter of email
  if (email && email.trim()) {
    return email.trim().charAt(0).toUpperCase();
  }

  // Fallback to 'U' for unknown
  return "U";
}