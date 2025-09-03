import { useMemo } from "react";

interface SecureTextProps {
  children: string | null | undefined;
  className?: string;
}

/**
 * SECURITY FIX: Component to safely display user-generated text and prevent XSS
 * Sanitizes HTML and prevents script injection while preserving text content
 */
export const SecureText = ({ children, className }: SecureTextProps) => {
  const sanitizedText = useMemo(() => {
    if (!children) return '';
    
    // Remove HTML tags and encode special characters
    return children
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }, [children]);

  return (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedText }}
    />
  );
};