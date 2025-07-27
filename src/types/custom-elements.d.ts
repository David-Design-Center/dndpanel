// Add type declarations for the custom email-viewer element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'email-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: React.Ref<any>;
        style?: React.CSSProperties;
        className?: string;
      };
    }
  }
}

// Make sure this file is treated as a module
export {};
