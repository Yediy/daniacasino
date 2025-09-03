interface SecureTextProps {
  children: string | null | undefined;
  className?: string;
}

/**
 * SECURITY FIX: Component to safely display user-generated text and prevent XSS
 * Renders text content safely without dangerouslySetInnerHTML
 */
export const SecureText = ({ children, className }: SecureTextProps) => {
  // Simply render the text content safely - React automatically escapes it
  return (
    <span className={className}>
      {children || ''}
    </span>
  );
};