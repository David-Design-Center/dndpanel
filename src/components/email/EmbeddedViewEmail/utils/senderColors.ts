/**
 * Generate consistent color class for sender based on email hash
 */
export const getSenderColor = (email: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-cyan-500',
  ];

  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

/**
 * Clean display name by removing angle brackets
 */
export const cleanDisplayName = (name: string): string => {
  if (!name) return '';
  // Remove < and > brackets
  return name.replace(/[<>]/g, '').trim();
};
