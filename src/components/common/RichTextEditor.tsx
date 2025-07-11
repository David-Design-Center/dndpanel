import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link, 
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  ChevronDown,
  Image
} from 'lucide-react';
import { Button } from '../ui/button';
import { Toggle } from '../ui/toggle';
import { cn } from '../../lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Compose your message...",
  className,
  minHeight = "200px",
  disabled = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showHighlightColors, setShowHighlightColors] = useState(false);
  const [showImageSizes, setShowImageSizes] = useState(false);
  const [selectedImageSize, setSelectedImageSize] = useState('medium');
  const [isFormatted, setIsFormatted] = useState({
    bold: false,
    italic: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false
  });
  // Show Gmail compatibility tip for images
  const [showGmailTip, setShowGmailTip] = useState(false);

  // Image size options
  const imageSizes = [
    { name: 'Small', value: 'small', width: '200px' },
    { name: 'Medium', value: 'medium', width: '400px' },
    { name: 'Large', value: 'large', width: '600px' },
    { name: 'Full Width', value: 'full', width: '100%' }
  ];

  // Predefined highlight colors
  const highlightColors = [
    { name: 'Yellow', value: '#ffeb3b', display: '#fff176' },
    { name: 'Green', value: '#c8e6c9', display: '#a5d6a7' },
    { name: 'Blue', value: '#bbdefb', display: '#90caf9' },
    { name: 'Pink', value: '#f8bbd9', display: '#f48fb1' },
    { name: 'Orange', value: '#ffe0b2', display: '#ffcc02' },
    { name: 'Purple', value: '#e1bee7', display: '#ce93d8' },
    { name: 'Red', value: '#ffcdd2', display: '#ef9a9a' },
    { name: 'Cyan', value: '#b2ebf2', display: '#80deea' },
  ];

  // Update editor content when value prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  }, [onChange]);

  // Update toolbar state based on cursor position
  const updateToolbarState = useCallback(() => {
    if (!editorRef.current) return;

    try {
      setIsFormatted({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        unorderedList: document.queryCommandState('insertUnorderedList'),
        orderedList: document.queryCommandState('insertOrderedList'),
        alignLeft: document.queryCommandState('justifyLeft'),
        alignCenter: document.queryCommandState('justifyCenter'),
        alignRight: document.queryCommandState('justifyRight')
      });
    } catch (error) {
      // Ignore errors from queryCommandState
    }
  }, []);

  // Execute formatting command
  const executeCommand = useCallback((command: string, value?: string) => {
    if (disabled) return;
    
    try {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
      updateToolbarState();
      handleInput();
    } catch (error) {
      console.warn('Command execution failed:', error);
    }
  }, [disabled, updateToolbarState, handleInput]);

  // Handle selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      updateToolbarState();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateToolbarState]);

  // Handle clicking outside highlight color picker and Gmail tip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showHighlightColors && !target.closest('.highlight-color-picker')) {
        setShowHighlightColors(false);
      }
      if (showImageSizes && !target.closest('.image-size-picker')) {
        setShowImageSizes(false);
      }
      if (showGmailTip && !target.closest('.gmail-tip')) {
        setShowGmailTip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHighlightColors, showImageSizes, showGmailTip]);

  // Handle link insertion
  const insertLink = useCallback(() => {
    if (disabled) return;
    
    const url = prompt('Enter the URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  }, [disabled, executeCommand]);

  // Gmail-compatible image processing - unified with email sending logic
  const createGmailCompatibleImage = useCallback((imageSrc: string, fileName: string, sizeValue: string) => {
    const sizeConfig = imageSizes.find(size => size.value === sizeValue) || imageSizes[1];
    
    // Create image element with Gmail-optimized attributes
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = fileName;
    
    // Gmail-compatible inline styles (exact match to Gmail Compose behavior)
    const styles = [
      `max-width: ${sizeConfig.width}`,
      `width: ${sizeConfig.value === 'full' ? '100%' : sizeConfig.width}`,
      'height: auto',
      'display: block',
      'margin: 10px auto',
      'border-radius: 4px',
      'box-sizing: border-box',
      'border: none',
      // Add styles that ensure proper rendering in email clients
      'vertical-align: top',
      'outline: none'
    ];
    
    img.style.cssText = styles.join('; ') + ';';
    
    // Add data attributes for identification and processing
    img.setAttribute('data-size', sizeValue);
    img.setAttribute('data-filename', fileName);
    img.setAttribute('data-gmail-inline', 'true'); // Mark as Gmail inline image
    img.className = `inline-image-${sizeValue}`;
    
    // Set title for accessibility
    img.title = fileName;
    
    return img;
  }, [imageSizes]);

  // Handle text highlighting
  const applyHighlight = useCallback((color: string) => {
    if (disabled) return;
    
    try {
      executeCommand('hiliteColor', color);
      setShowHighlightColors(false);
    } catch (error) {
      // Fallback for browsers that don't support hiliteColor
      executeCommand('backColor', color);
      setShowHighlightColors(false);
    }
  }, [disabled, executeCommand]);

  // Remove highlight
  const removeHighlight = useCallback(() => {
    if (disabled) return;
    
    try {
      executeCommand('hiliteColor', 'transparent');
      setShowHighlightColors(false);
    } catch (error) {
      executeCommand('backColor', 'transparent');
      setShowHighlightColors(false);
    }
  }, [disabled, executeCommand]);

  // Handle image insertion
  const insertImage = useCallback(() => {
    if (disabled) return;
    imageInputRef.current?.click();
  }, [disabled]);

  // Handle image file selection with size control
  const handleImageFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageSrc = event.target?.result as string;
      if (imageSrc && editorRef.current) {
        // Create Gmail-compatible image
        const img = createGmailCompatibleImage(imageSrc, file.name, selectedImageSize);
        
        // Insert image at cursor position
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(img);
          
          // Move cursor after image
          range.setStartAfter(img);
          range.setEndAfter(img);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          // Fallback: append to end
          editorRef.current.appendChild(img);
        }
        
        handleInput();
        editorRef.current.focus();
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, [handleInput, selectedImageSize, createGmailCompatibleImage]);

  // Handle paste to clean up formatting and handle images
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    // Check if there are image files in the clipboard
    const clipboardItems = e.clipboardData.items;
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageSrc = event.target?.result as string;
            if (imageSrc && editorRef.current) {
              // Create Gmail-compatible image
              const img = createGmailCompatibleImage(imageSrc, 'Pasted image', selectedImageSize);
              
              // Insert image at cursor position
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(img);
                
                // Move cursor after image
                range.setStartAfter(img);
                range.setEndAfter(img);
                selection.removeAllRanges();
                selection.addRange(range);
              } else {
                // Fallback: append to end
                editorRef.current.appendChild(img);
              }
              
              handleInput();
              editorRef.current.focus();
            }
          };
          reader.readAsDataURL(file);
        }
        return; // Exit early for image paste
      }
    }
    
    // Handle text paste
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    executeCommand('insertText', text);
  }, [executeCommand, handleInput, selectedImageSize, createGmailCompatibleImage]);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    // Handle common shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          executeCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          executeCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          executeCommand('underline');
          break;
        case 'k':
          e.preventDefault();
          insertLink();
          break;
      }
    }
  }, [disabled, executeCommand, insertLink]);

  // Change size of selected image
  const changeSelectedImageSize = useCallback((newSize: string) => {
    if (disabled) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    let element = range.commonAncestorContainer;
    
    // Find the selected image
    let imageElement: HTMLImageElement | null = null;
    
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentNode as Element;
    }
    
    if (element instanceof HTMLImageElement) {
      imageElement = element;
    } else if (element instanceof Element) {
      imageElement = element.querySelector('img');
      if (!imageElement) {
        // Look for image in the selected range
        const images = editorRef.current?.querySelectorAll('img');
        if (images) {
          for (const img of images) {
            if (selection.containsNode(img, true)) {
              imageElement = img;
              break;
            }
          }
        }
      }
    }
    
    if (imageElement) {
      // Update the image size
      const sizeConfig = imageSizes.find(size => size.value === newSize) || imageSizes[1];
      
      // Remove old size classes
      imageSizes.forEach(size => {
        imageElement!.classList.remove(`inline-image-${size.value}`);
      });
      
      // Add new size class and update styles
      imageElement.className = `inline-image-${newSize}`;
      imageElement.setAttribute('data-size', newSize);
      
      // Update inline styles for Gmail compatibility
      const styles = [
        `max-width: ${sizeConfig.width}`,
        `width: ${sizeConfig.value === 'full' ? '100%' : sizeConfig.width}`,
        'height: auto',
        'display: block',
        'margin: 10px auto',
        'border-radius: 4px',
        'box-sizing: border-box',
        'border: none'
      ];
      
      imageElement.style.cssText = styles.join('; ') + ';';
      
      setSelectedImageSize(newSize);
      handleInput();
      
      console.log(`📐 Changed image size to: ${newSize}`);
    }
  }, [disabled, handleInput, imageSizes]);

  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden rich-text-editor", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 flex-wrap rich-text-toolbar">
        {/* Text formatting */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
          <Toggle
            size="sm"
            pressed={isFormatted.bold}
            onPressedChange={() => executeCommand('bold')}
            disabled={disabled}
            title="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isFormatted.italic}
            onPressedChange={() => executeCommand('italic')}
            disabled={disabled}
            title="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isFormatted.underline}
            onPressedChange={() => executeCommand('underline')}
            disabled={disabled}
            title="Underline (Ctrl+U)"
          >
            <Underline size={14} />
          </Toggle>
          
          {/* Text Highlight */}
          <div className="relative highlight-color-picker">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowHighlightColors(!showHighlightColors)}
              disabled={disabled}
              title="Text Highlight"
              className="h-8 px-2 relative"
            >
              <Highlighter size={14} />
              <ChevronDown size={10} className="ml-1" />
            </Button>
            
            {showHighlightColors && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 min-w-[200px]">
                <div className="text-xs font-medium text-gray-700 mb-2">Highlight Colors</div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {highlightColors.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => applyHighlight(color.value)}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.display }}
                      title={`Highlight with ${color.name}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={removeHighlight}
                  className="w-full text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded border border-gray-200"
                >
                  Remove Highlight
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
          <Toggle
            size="sm"
            pressed={isFormatted.unorderedList}
            onPressedChange={() => executeCommand('insertUnorderedList')}
            disabled={disabled}
            title="Bullet List"
          >
            <List size={14} />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isFormatted.orderedList}
            onPressedChange={() => executeCommand('insertOrderedList')}
            disabled={disabled}
            title="Numbered List"
          >
            <ListOrdered size={14} />
          </Toggle>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
          <Toggle
            size="sm"
            pressed={isFormatted.alignLeft}
            onPressedChange={() => executeCommand('justifyLeft')}
            disabled={disabled}
            title="Align Left"
          >
            <AlignLeft size={14} />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isFormatted.alignCenter}
            onPressedChange={() => executeCommand('justifyCenter')}
            disabled={disabled}
            title="Align Center"
          >
            <AlignCenter size={14} />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isFormatted.alignRight}
            onPressedChange={() => executeCommand('justifyRight')}
            disabled={disabled}
            title="Align Right"
          >
            <AlignRight size={14} />
          </Toggle>
        </div>

        {/* Additional formatting */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={insertLink}
            disabled={disabled}
            title="Insert Link (Ctrl+K)"
            className="h-8 px-2"
          >
            <Link size={14} />
          </Button>
          
          {/* Image with Size Picker */}
          <div className="relative image-size-picker">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowImageSizes(!showImageSizes)}
              disabled={disabled}
              title="Insert Image"
              className="h-8 px-2 relative"
            >
              <Image size={14} />
              <ChevronDown size={10} className="ml-1" />
            </Button>
            
            {showImageSizes && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 min-w-[180px] image-size-picker">
                <div className="text-xs font-medium text-gray-700 mb-2">Image Size</div>
                <div className="space-y-1">
                  {imageSizes.map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      onClick={() => {
                        setSelectedImageSize(size.value);
                        setShowImageSizes(false);
                        
                        // Check if there's a selected image to resize
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                          const range = selection.getRangeAt(0);
                          let element = range.commonAncestorContainer;
                          
                          if (element.nodeType === Node.TEXT_NODE) {
                            element = element.parentNode as Element;
                          }
                          
                          // Check if an image is selected
                          const hasSelectedImage = element instanceof HTMLImageElement || 
                            (element instanceof Element && element.querySelector('img')) ||
                            (editorRef.current?.querySelectorAll('img') && 
                             Array.from(editorRef.current.querySelectorAll('img')).some(img => 
                               selection.containsNode(img, true)));
                          
                          if (hasSelectedImage) {
                            // Change existing image size
                            changeSelectedImageSize(size.value);
                          } else {
                            // Insert new image
                            insertImage();
                          }
                        } else {
                          // Insert new image
                          insertImage();
                        }
                      }}
                      className={cn(
                        "w-full text-left text-xs px-2 py-2 rounded hover:bg-gray-100 transition-colors",
                        selectedImageSize === size.value && "bg-blue-50 text-blue-700"
                      )}
                    >
                      <div className="font-medium">{size.name}</div>
                      <div className="text-gray-500">{size.width}</div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImageSizes(false);
                      insertImage();
                    }}
                    className="w-full text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                  >
                    Insert New Image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGmailTip(!showGmailTip);
                      setShowImageSizes(false);
                    }}
                    className="w-full text-xs px-2 py-1 mt-1 text-gray-600 hover:bg-gray-50 rounded border border-gray-200"
                  >
                    ℹ️ Gmail Compatibility
                  </button>
                </div>
              </div>
            )}
            
            {/* Gmail compatibility tip */}
            {showGmailTip && (
              <div className="absolute top-full left-0 mt-1 bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-3 z-20 max-w-xs text-xs gmail-tip">
                <div className="font-medium text-blue-800 mb-2">📧 Enhanced Gmail Inline Images</div>
                <div className="text-blue-700 space-y-1">
                  <p>✅ <strong>Our app:</strong> Perfect inline image display</p>
                  <p>📧 <strong>All email clients:</strong> Images sent with RFC-compliant MIME structure</p>
                  <p>🔄 <strong>Gmail, Outlook, Apple Mail:</strong> Full compatibility with multipart/related + CID attachments</p>
                  <p className="text-blue-600 mt-2">💡 <strong>Technical:</strong> Uses multipart/alternative structure with proper Content-ID headers for maximum compatibility!</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGmailTip(false)}
                  className="mt-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Got it!
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className={cn(
          "p-4 focus:outline-none",
          "prose prose-sm max-w-none",
          "text-gray-900 leading-relaxed",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{ minHeight }}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />
      
      {/* Hidden file input for images */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFile}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default RichTextEditor;
