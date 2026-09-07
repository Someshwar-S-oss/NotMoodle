import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Folder, { darkenColor } from '@/components/Folder';

describe('darkenColor utility', () => {
  it('darkens 6-digit hex colors correctly with percent as fraction or whole number', () => {
    // #FFFFFF darkened by 10% (0.1) -> floor(255 * 0.9) = 229 = #E5E5E5
    const darkenedFraction = darkenColor('#FFFFFF', 0.1);
    expect(darkenedFraction.toUpperCase()).toBe('#E5E5E5');

    const darkenedWhole = darkenColor('#FFFFFF', 10);
    expect(darkenedWhole.toUpperCase()).toBe('#E5E5E5');
  });

  it('handles 3-digit shorthand hex colors', () => {
    const darkened = darkenColor('#FFF', 0.1);
    expect(darkened.toUpperCase()).toBe('#E5E5E5');
  });

  it('handles hex without leading hash', () => {
    const darkened = darkenColor('FFFFFF', 0.1);
    expect(darkened.toUpperCase()).toBe('#E5E5E5');
  });
});

describe('Folder component', () => {
  it('renders with default color and closed state', () => {
    render(<Folder />);
    const button = screen.getByRole('button', { name: /open folder/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveStyle({
      '--folder-color': '#5227FF',
    });
  });

  it('applies custom color and calculates folder back color', () => {
    const customColor = '#FF0000';
    render(<Folder color={customColor} />);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      '--folder-color': customColor,
      '--folder-back-color': darkenColor(customColor, 0.08),
    });
  });

  it('applies scale transform based on size prop', () => {
    const { container } = render(<Folder size={0.65} />);
    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer).toHaveStyle('transform: scale(0.65)');
  });

  it('renders custom paper items (up to 3 items)', () => {
    const items = [
      <span key="1">Paper One</span>,
      <span key="2">Paper Two</span>,
      <span key="3">Paper Three</span>,
      <span key="4">Paper Four</span>,
    ];

    render(<Folder items={items} />);
    expect(screen.getByText('Paper One')).toBeInTheDocument();
    expect(screen.getByText('Paper Two')).toBeInTheDocument();
    expect(screen.getByText('Paper Three')).toBeInTheDocument();
    expect(screen.queryByText('Paper Four')).not.toBeInTheDocument();
  });

  it('toggles open state and calls onToggle on click', () => {
    const onToggle = jest.fn();
    render(<Folder onToggle={onToggle} />);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(onToggle).toHaveBeenCalledWith(true);

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('toggles on Enter and Space keyboard events', () => {
    const onToggle = jest.fn();
    render(<Folder onToggle={onToggle} />);
    const button = screen.getByRole('button');

    fireEvent.keyDown(button, { key: 'Enter' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(onToggle).toHaveBeenCalledWith(true);

    fireEvent.keyDown(button, { key: ' ' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('supports controlled open prop', () => {
    const onToggle = jest.fn();
    const { rerender } = render(<Folder open={true} onToggle={onToggle} />);
    const button = screen.getByRole('button', { name: /close folder/i });
    expect(button).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(false);
    // In controlled mode, aria-expanded remains true until parent changes prop
    expect(button).toHaveAttribute('aria-expanded', 'true');

    rerender(<Folder open={false} onToggle={onToggle} />);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('handles non-interactive mode cleanly without intercepting events', () => {
    const onToggle = jest.fn();
    render(<Folder interactive={false} onToggle={onToggle} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const presentation = screen.getByRole('presentation');
    expect(presentation).toBeInTheDocument();
    expect(presentation).not.toHaveAttribute('aria-expanded');

    fireEvent.click(presentation);
    expect(onToggle).not.toHaveBeenCalled();

    fireEvent.keyDown(presentation, { key: 'Enter' });
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('computes magnetic coordinates on mouse move and resets on mouse leave when open', () => {
    const { container } = render(
      <Folder
        open={true}
        items={[<div key="1">Interactive Content</div>]}
      />
    );

    const paper = container.querySelector('.paper-1') as HTMLElement;
    expect(paper).toBeInTheDocument();

    // Mock getBoundingClientRect
    jest.spyOn(paper, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      right: 200,
      bottom: 200,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    fireEvent.mouseMove(paper, { clientX: 180, clientY: 180 });
    // centerX = 150, centerY = 150 -> offset = (180 - 150) * 0.15 = 4.5px
    expect(paper.style.getPropertyValue('--magnet-x')).toBe('4.5px');
    expect(paper.style.getPropertyValue('--magnet-y')).toBe('4.5px');

    fireEvent.mouseLeave(paper);
    expect(paper.style.getPropertyValue('--magnet-x')).toBe('0px');
    expect(paper.style.getPropertyValue('--magnet-y')).toBe('0px');
  });
});
