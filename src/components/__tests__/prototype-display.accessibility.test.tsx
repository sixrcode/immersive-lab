import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { PrototypeDisplay } from '../prototype-display';
import type { PromptPackage, MoodBoardCell } from '@/lib/types';

// Extend expect with jest-axe matchers (globally done in jest.setup.js, but can be here for clarity too)
expect.extend(toHaveNoViolations);

// Mocks for UI components - reusing from prototype-display.test.tsx
jest.mock('@/components/ui/card', () => {
  const MockCard = (props: { children: React.ReactNode }) => <div data-testid="card">{props.children}</div>; MockCard.displayName = 'MockCard';
  const MockCardContent = (props: { children: React.ReactNode }) => <div data-testid="card-content">{props.children}</div>; MockCardContent.displayName = 'MockCardContent';
  const MockCardHeader = (props: { children: React.ReactNode }) => <div data-testid="card-header">{props.children}</div>; MockCardHeader.displayName = 'MockCardHeader';
  const MockCardTitle = (props: { children: React.ReactNode }) => <div data-testid="card-title">{props.children}</div>; MockCardTitle.displayName = 'MockCardTitle';
  const MockCardDescription = (props: { children: React.ReactNode }) => <div data-testid="card-description">{props.children}</div>; MockCardDescription.displayName = 'CardDescription';
  return { Card: MockCard, CardContent: MockCardContent, CardHeader: MockCardHeader, CardTitle: MockCardTitle, CardDescription: MockCardDescription };
});
jest.mock('@/components/ui/badge', () => {
  const MockBadge = React.forwardRef<HTMLSpanElement, { children: React.ReactNode; variant?: string }>(
    (props, ref) => <span ref={ref} data-testid="badge" className={`variant-${props.variant}`}>{props.children}</span>
  );
  MockBadge.displayName = 'Badge';
  return { Badge: MockBadge };
});
jest.mock('@/components/ui/button', () => {
  const MockButton = React.forwardRef<HTMLButtonElement, { children: React.ReactNode; title?: string; "data-testid"?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>>(
    (props, ref) => {
      const testId = props["data-testid"] || `button-${props.title || (typeof props.children === 'string' ? props.children : 'complex')}`;
      return <button ref={ref} data-testid={testId} {...props}>{props.children}</button>;
    }
  );
  MockButton.displayName = 'Button';
  return { Button: MockButton };
});
jest.mock('@/components/ui/table', () => {
  type MockTableProps = React.HTMLAttributes<HTMLTableElement> & { children?: React.ReactNode };
  const MockTable = React.forwardRef<HTMLTableElement, MockTableProps>((props, ref) => <table ref={ref} data-testid="table" {...props}>{props.children}</table>); MockTable.displayName = "Table";
  type MockTableBodyProps = React.HTMLAttributes<HTMLTableSectionElement> & { children?: React.ReactNode };
  const MockTableBody = React.forwardRef<HTMLTableSectionElement, MockTableBodyProps>((props, ref) => <tbody ref={ref} data-testid="table-body" {...props}>{props.children}</tbody>); MockTableBody.displayName = "TableBody";
  type MockTableCellProps = React.TdHTMLAttributes<HTMLTableCellElement> & { children?: React.ReactNode };
  const MockTableCell = React.forwardRef<HTMLTableCellElement, MockTableCellProps>((props, ref) => <td ref={ref} data-testid="table-cell" {...props}>{props.children}</td>); MockTableCell.displayName = "TableCell";
  type MockTableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement> & { children?: React.ReactNode };
  const MockTableHead = React.forwardRef<HTMLTableCellElement, MockTableHeadProps>((props, ref) => <th ref={ref} data-testid="table-head" {...props}>{props.children}</th>); MockTableHead.displayName = "TableHead";
  type MockTableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement> & { children?: React.ReactNode };
  const MockTableHeader = React.forwardRef<HTMLTableSectionElement, MockTableHeaderProps>((props, ref) => <thead ref={ref} data-testid="table-header" {...props}>{props.children}</thead>); MockTableHeader.displayName = "TableHeader";
  type MockTableRowProps = React.HTMLAttributes<HTMLTableRowElement> & { children?: React.ReactNode };
  const MockTableRow = React.forwardRef<HTMLTableRowElement, MockTableRowProps>((props, ref) => <tr ref={ref} data-testid="table-row" {...props}>{props.children}</tr>); MockTableRow.displayName = "TableRow";
  return { Table: MockTable, TableBody: MockTableBody, TableCell: MockTableCell, TableHead: MockTableHead, TableHeader: MockTableHeader, TableRow: MockTableRow };
});
jest.mock('@/components/ui/separator', () => {
  type MockSeparatorProps = React.HTMLAttributes<HTMLHRElement>;
  const MockSeparator = React.forwardRef<HTMLHRElement, MockSeparatorProps>(
    (props, ref) => <hr ref={ref} data-testid="separator" {...props} />
  );
  MockSeparator.displayName = 'Separator';
  return { Separator: MockSeparator };
});
// Mock FeedbackDialog and related hooks/components as they are not central to basic display accessibility
jest.mock('@/components/feedback/FeedbackDialog', () => ({
  FeedbackDialog: (props: { isOpen: boolean }) => props.isOpen ? <div data-testid="feedback-dialog">Mock Feedback Dialog</div> : null,
}));
jest.mock('@/hooks/useSubmitFeedback', () => ({
  useSubmitFeedback: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));


// Mock data for PromptPackage (reusing from prototype-display.test.tsx)
const mockPromptPackage: PromptPackage = {
  id: 'testpkg-axe-001',
  userId: 'user-axe-01',
  prompt: 'A serene landscape with mountains and a lake under a blue sky.',
  stylePreset: 'impressionistic',
  originalImageURL: 'https://example.com/original-axe.jpg',
  createdAt: new Date('2023-11-01T10:00:00Z'),
  updatedAt: new Date('2023-11-01T10:05:00Z'),
  loglines: [
    { tone: 'Calm', text: 'Still waters reflect the silent peaks, a world untouched by time.' },
    { tone: 'Majestic', text: 'Mountains rise to meet the endless sky, guarding the tranquil lake.' },
  ],
  moodBoard: {
    generatedImageURL: 'https://example.com/moodboard_gen_axe.png',
    cells: Array(3).fill(null).map((_, i) => ({ // Reduced cells for brevity
      title: `Visual Element ${i + 1}`,
      description: `Detailed notes on element ${i + 1}, focusing on color and light.`,
    })),
  },
  shotList: [
    { shotNumber: 1, lens: '35mm', cameraMove: 'Wide Shot - Gentle Dolly In', framingNotes: 'Capture the breadth of the landscape.' },
    { shotNumber: 2, lens: '50mm', cameraMove: 'Medium Shot - Static', framingNotes: 'Focus on the lake\'s reflection of the mountains.' },
  ],
  animaticDescription: 'A slow pan across the landscape, followed by a focus on the reflections in the water.',
  pitchSummary: 'An exploration of tranquility and natural beauty through an impressionistic lens.',
  version: 1,
};

describe('PrototypeDisplay Accessibility', () => {
  it('should have no axe violations on initial render', async () => {
    const { container } = render(<PrototypeDisplay promptPackage={mockPromptPackage} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no axe violations when originalImageURL is not provided', async () => {
    const pkgWithoutOriginalImage = { ...mockPromptPackage, originalImageURL: undefined };
    const { container } = render(<PrototypeDisplay promptPackage={pkgWithoutOriginalImage} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no axe violations when onRegenerate is provided', async () => {
    const mockOnRegenerate = jest.fn();
    const { container } = render(<PrototypeDisplay promptPackage={mockPromptPackage} onRegenerate={mockOnRegenerate} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
