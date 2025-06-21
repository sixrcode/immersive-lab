import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge'; // Adjust path as necessary

describe('Badge Component', () => {
  test('renders with children', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  test('applies default variant classes', () => {
    render(<Badge data-testid="badge">Default Badge</Badge>);
    // Get the expected classes for the default variant
    // We don't check all classes, just that it's not empty and contains some key parts if possible
    // or rely on a snapshot if visual regression is not a concern for class names.
    // For now, let's check if it has the base classes from cva.
    const badgeElement = screen.getByTestId('badge');

    // Check if a substantial part of the expected classes are present.
    // This is a basic check. More robust class checking might involve splitting strings or using a library.
    expect(badgeElement.className).toContain('inline-flex'); // from base cva
    expect(badgeElement.className).toContain('bg-primary'); // from default variant
  });

  test('applies secondary variant classes', () => {
    render(<Badge variant="secondary" data-testid="badge-secondary">Secondary Badge</Badge>);
    expect(screen.getByText('Secondary Badge')).toBeInTheDocument();
    const badgeElement = screen.getByTestId('badge-secondary');

    expect(badgeElement.className).toContain('bg-secondary'); // from secondary variant
    expect(badgeElement.className).toContain('text-secondary-foreground');
  });

  test('applies destructive variant classes', () => {
    render(<Badge variant="destructive" data-testid="badge-destructive">Destructive Badge</Badge>);
    expect(screen.getByText('Destructive Badge')).toBeInTheDocument();
    const badgeElement = screen.getByTestId('badge-destructive');

    expect(badgeElement.className).toContain('bg-destructive');
    expect(badgeElement.className).toContain('text-destructive-foreground');
  });

  test('applies outline variant classes', () => {
    render(<Badge variant="outline" data-testid="badge-outline">Outline Badge</Badge>);
    expect(screen.getByText('Outline Badge')).toBeInTheDocument();
    const badgeElement = screen.getByTestId('badge-outline');

    expect(badgeElement.className).toContain('text-foreground'); // From outline variant
    expect(badgeElement.className).not.toContain('bg-primary'); // Ensure it doesn't have default bg
  });

  test('applies additional className', () => {
    render(<Badge className="custom-class">Custom Class Badge</Badge>);
    const badgeElement = screen.getByText('Custom Class Badge');
    expect(badgeElement).toHaveClass('custom-class');
    expect(badgeElement.className).toContain('bg-primary'); // Default variant should still apply
  });
});
