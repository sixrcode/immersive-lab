import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PromptInput } from '../prompt-input'; // Adjust path as necessary

// Mock child components that might cause issues if not handled or are irrelevant to this test's focus.
jest.mock('@/components/ui/textarea', () => {
  const MockTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => <textarea data-testid="textarea" {...props} />;
  MockTextarea.displayName = 'MockTextarea';
  return { Textarea: MockTextarea };
});
jest.mock('@/components/ui/input', () => {
  const MockInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => <input data-testid="input-file" {...props} />;
  MockInput.displayName = 'MockInput';
  return { Input: MockInput };
});
jest.mock('@/components/ui/button', () => {
  const MockButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => <button data-testid="button" {...props} />;
  MockButton.displayName = 'Button'; // Corrected displayName to match exported component
  return { Button: MockButton };
});

jest.mock('@/components/ui/label', () => {
  const MockLabel: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = (props) => <label {...props} />;
  MockLabel.displayName = 'Label'; // Corrected displayName to match exported component
  return { Label: MockLabel };
});

jest.mock('@/components/ui/select', () => {
  const RealReact = jest.requireActual('react');

  const Select = React.forwardRef<HTMLDivElement, { children?: React.ReactNode, value?: string, onValueChange?: (value: string) => void, disabled?: boolean }>(
    ({ children, value, onValueChange, disabled }, ref) => {
      const trigger = RealReact.Children.toArray(children).find(
        (child: any) => child.type && child.type.displayName === 'SelectTrigger'
      );
      const content = RealReact.Children.toArray(children).find(
        (child: any) => child.type && child.type.displayName === 'SelectContent'
      );

      let options: React.ReactNode[] = [];
      if (content && RealReact.isValidElement(content) && content.props.children) {
        options = RealReact.Children.toArray(content.props.children).filter(
            (child: any) => child.type && child.type.displayName === 'SelectItem'
        );
      }

      return (
        <div ref={ref}> {/* Main container for the mock */}
          {trigger} {/* Render the trigger part (which includes SelectValue for placeholder) */}
          <select data-testid="select" value={value} onChange={e => onValueChange?.(e.target.value)} disabled={disabled} style={{ display: 'none' }}> {/* Hidden select for interaction */}
            {options}
          </select>
        </div>
      );
    }
  );
  Select.displayName = 'Select';

  const SelectItem = React.forwardRef<HTMLOptionElement, { children?: React.ReactNode, value: string }>(
    ({ value, children }, ref) => <option ref={ref} value={value} data-testid={`select-item-${value}`}>{children}</option>
  );
  SelectItem.displayName = 'SelectItem';

  const SelectTrigger = React.forwardRef<HTMLDivElement, { children?: React.ReactNode }>(
    ({ children }, ref) => <div ref={ref} data-testid="select-trigger">{children}</div>
  );
  SelectTrigger.displayName = 'SelectTrigger';

  const SelectValue = React.forwardRef<HTMLSpanElement, { children?: React.ReactNode, placeholder?: string }>(
    ({ placeholder, children }, ref) => <span ref={ref} data-testid="select-value">{children || placeholder}</span>
  );
  SelectValue.displayName = 'SelectValue';

  const SelectContent = React.forwardRef<HTMLDivElement, { children?: React.ReactNode }>( // Effectively a passthrough for options for the hidden select
    ({ children }, ref) => <div ref={ref} data-testid="select-content" style={{display: 'none'}}>{children}</div>
  );
  SelectContent.displayName = 'SelectContent';

  return { Select, SelectItem, SelectTrigger, SelectValue, SelectContent };
});

describe('PromptInput Component', () => {
  const mockOnSubmit = jest.fn();

  // Define a type for the mocked FileReader
  interface MockedFileReader extends EventTarget {
    readAsDataURL: jest.Mock;
    onloadend: ((this: MockedFileReader, ev: ProgressEvent<MockedFileReader>) => any) | null;
    result: string | ArrayBuffer | null;
  }

  beforeEach(() => {
    mockOnSubmit.mockClear();
    // Mock FileReader
    global.FileReader = jest.fn(() => {
      let onloadendCallback: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
      const fr = {
        readAsDataURL: jest.fn(function(this: any) {
          if (onloadendCallback) {
            // Simulate async behavior with a timeout
            setTimeout(() => onloadendCallback.call(fr, new ProgressEvent('loadend')), 0);
          }
        }),
        set onloadend(callback: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null) {
          onloadendCallback = callback;
        },
        get onloadend() {
          return onloadendCallback;
        },
        result: 'data:image/png;base64,mockedimagedata',
      };
      return fr;
    }) as any;
  });

  it('renders correctly with initial state', () => {
    render(<PromptInput onSubmit={mockOnSubmit} />);
    expect(screen.getByPlaceholderText(/Describe your vision/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Optional: Upload Reference Image/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose a style.../i)).toBeInTheDocument(); // From SelectValue placeholder
    expect(screen.getByRole('button', { name: /Generate Prototype/i })).toBeInTheDocument();
  });

  it('updates prompt text state on change', () => {
    render(<PromptInput onSubmit={mockOnSubmit} />);
    const textarea = screen.getByPlaceholderText(/Describe your vision/i);
    fireEvent.change(textarea, { target: { value: 'New test prompt' } });
    expect(textarea).toHaveValue('New test prompt');
  });

  it('updates image file state and preview on file selection', async () => {
    render(<PromptInput onSubmit={mockOnSubmit} />);
    const inputElement = screen.getByLabelText(/Optional: Upload Reference Image/i) as HTMLInputElement;
    const mockFile = new File(['dummy content'], 'example.png', { type: 'image/png' });

    fireEvent.change(inputElement, { target: { files: [mockFile] } });

    // Wait for FileReader to do its work (mocked)
    await waitFor(() => {
      // Check if FileReader was called
      expect(FileReader).toHaveBeenCalled();
      // Check if an image preview is shown
      const imgPreview = screen.getByRole('img', { name: /Image preview/i });
      expect(imgPreview).toBeInTheDocument();
      expect(imgPreview).toHaveAttribute('src', 'data:image/png;base64,mockedimagedata');
    });
  });

  it('updates style preset state on change', () => {
    render(<PromptInput onSubmit={mockOnSubmit} />);
    // The actual Select component is mocked, so we interact with the mock <select>
    const selectElement = screen.getByTestId('select') as HTMLSelectElement;
    fireEvent.change(selectElement, { target: { value: 'anime' } });
    // In a real scenario with the actual Select, you'd click SelectTrigger, then SelectItem
    // Here, we directly test the value change on the mocked underlying select
    expect(selectElement.value).toBe('anime');
  });

  it('calls onSubmit with correct data when form is submitted (with image)', async () => {
    render(<PromptInput onSubmit={mockOnSubmit} />);

    // Set prompt
    fireEvent.change(screen.getByPlaceholderText(/Describe your vision/i), { target: { value: 'Test prompt with image' } });

    // Set style
    const selectElement = screen.getByTestId('select') as HTMLSelectElement;
    fireEvent.change(selectElement, { target: { value: 'cinematic' } });

    // Set image
    const inputElement = screen.getByLabelText(/Optional: Upload Reference Image/i) as HTMLInputElement;
    const mockFile = new File(['dummy image content'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(inputElement, { target: { files: [mockFile] } });

    // Wait for FileReader to process (even if mocked, good practice for async nature)
    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Image preview/i })).toBeInTheDocument();
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Generate Prototype/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith({
        prompt: 'Test prompt with image',
        imageDataUri: 'data:image/png;base64,mockedimagedata', // from mocked FileReader
        stylePreset: 'cinematic',
      });
    });
  });

  it('calls onSubmit with correct data when form is submitted (without image)', async () => {
    render(<PromptInput onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByPlaceholderText(/Describe your vision/i), { target: { value: 'Test prompt no image' } });
    const selectElement = screen.getByTestId('select') as HTMLSelectElement;
    fireEvent.change(selectElement, { target: { value: 'documentary' } });

    fireEvent.click(screen.getByRole('button', { name: /Generate Prototype/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith({
        prompt: 'Test prompt no image',
        imageDataUri: undefined,
        stylePreset: 'documentary',
      });
    });
  });


  it('disables form elements when isLoading is true', () => {
    render(<PromptInput onSubmit={mockOnSubmit} isLoading={true} />);
    expect(screen.getByPlaceholderText(/Describe your vision/i)).toBeDisabled();
    expect(screen.getByLabelText(/Optional: Upload Reference Image/i)).toBeDisabled();
    expect(screen.getByTestId('select')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Generating.../i })).toBeDisabled();
  });

  it('shows alert if submitted with no prompt and no image', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    render(<PromptInput onSubmit={mockOnSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /Generate Prototype/i }));

    expect(alertSpy).toHaveBeenCalledWith('Please enter a prompt or upload an image.');
    expect(mockOnSubmit).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
