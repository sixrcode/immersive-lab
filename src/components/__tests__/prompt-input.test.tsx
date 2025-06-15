import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PromptInput } from '../prompt-input'; // Adjust path as necessary

// Mock child components that might cause issues if not handled or are irrelevant to this test's focus.
jest.mock('@/components/ui/textarea', () => (props: any) => <textarea data-testid="textarea" {...props} />);
jest.mock('@/components/ui/input', () => (props: any) => <input data-testid="input-file" {...props} />);
jest.mock('@/components/ui/button', () => (props: any) => <button data-testid="button" {...props} />);
jest.mock('@/components/ui/select', () => ({
  Select: (props: any) => <select data-testid="select" value={props.value} onValueChange={props.onValueChange} disabled={props.disabled}>{props.children}</select>,
  SelectContent: (props: any) => <div data-testid="select-content">{props.children}</div>,
  SelectItem: (props: any) => <option data-testid={`select-item-${props.value}`} value={props.value}>{props.children}</option>,
  SelectTrigger: (props: any) => <div data-testid="select-trigger">{props.children}</div>,
  SelectValue: (props: any) => <div data-testid="select-value">{props.placeholder}</div>,
}));
jest.mock('@/components/ui/label', () => (props: any) => <label {...props} />);


describe('PromptInput Component', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    // Mock FileReader
    global.FileReader = jest.fn(() => ({
      readAsDataURL: jest.fn(),
      onloadend: jest.fn(),
      result: 'data:image/png;base64,mockedimagedata',
    })) as any;
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
