import React, { useRef, useEffect, useCallback, useState } from 'react';
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
  Image,
  FileSignature,
  Globe,
  FileSpreadsheet,
  Paperclip,
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
  signature?: string;
  showSignatureButton?: boolean;
  showPriceRequestButton?: boolean;
  onOpenPriceRequest?: () => void;
  onFileAttachment?: (files: FileList) => void;
  showFileAttachmentButton?: boolean;
  compact?: boolean; // New prop for compact mode
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  className,
  minHeight = "400px",
  disabled = false,
  signature = '',
  showSignatureButton = false,
  showPriceRequestButton = false,
  onOpenPriceRequest,
  onFileAttachment,
  showFileAttachmentButton = false,
  compact = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHighlightColors, setShowHighlightColors] = useState(false);
  const [showImageSizes, setShowImageSizes] = useState(false);
  const [showImageUrlDialog, setShowImageUrlDialog] = useState(false); // Add this state
  const [imageUrl, setImageUrl] = useState(''); // Add this state
  const [savedRange, setSavedRange] = useState<Range | null>(null);
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

  // Image size options
  const imageSizes = [
    { name: 'Small', value: 'small', width: '200px' },
    { name: 'Medium', value: 'medium', width: '400px' },
    { name: 'Large', value: 'large', width: '600px' },
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

  // Enhanced link processing
  // Enhanced image loading with retry mechanism
  const enhanceImages = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const images = editor.querySelectorAll('img');
    images.forEach(img => {
      const imgElement = img as HTMLImageElement;
      
      // Add retry mechanism for image loading
      if (!imgElement.hasAttribute('data-retry-setup')) {
        imgElement.setAttribute('data-retry-setup', 'true');
        
        let retryCount = 0;
        const maxRetries = 3;
        
        const retryLoad = () => {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying image load (${retryCount}/${maxRetries}):`, imgElement.src);
            // Force reload by adding timestamp
            const src = imgElement.src;
            const separator = src.includes('?') ? '&' : '?';
            imgElement.src = `${src}${separator}_retry=${Date.now()}`;
          }
        };
        
        imgElement.onerror = retryLoad;
      }
    });
  }, []);

  const enhanceLinks = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const links = editor.querySelectorAll('a[href]');
    links.forEach(link => {
      const linkElement = link as HTMLAnchorElement;
      
      // Set target to open in new window
      linkElement.target = '_blank';
      linkElement.rel = 'noopener noreferrer';
      
      // Add tooltip with URL and instruction
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? 'Cmd' : 'Ctrl';
      linkElement.title = `${linkElement.href}\n\n${modifierKey}+Click to open in new tab`;
      
      // Make it clickable during editing
      linkElement.style.cursor = 'pointer';
      
      // Remove any existing click handlers and add new one
      linkElement.onclick = (e) => {
        if (e.ctrlKey || e.metaKey) {
          // Open in new tab when Ctrl/Cmd + click
          e.preventDefault();
          window.open(linkElement.href, '_blank', 'noopener,noreferrer');
        }
      };
      
      // Add hover effect to show it's clickable
      linkElement.onmouseenter = () => {
        linkElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        linkElement.style.borderRadius = '2px';
        linkElement.style.padding = '1px 2px';
        linkElement.style.margin = '-1px -2px';
      };
      
      linkElement.onmouseleave = () => {
        linkElement.style.backgroundColor = '';
        linkElement.style.borderRadius = '';
        linkElement.style.padding = '';
        linkElement.style.margin = '';
      };
    });
  }, []);

  // Update editor content when value prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      // Enhance any links and images in the loaded content
      setTimeout(() => {
        enhanceLinks();
        enhanceImages();
      }, 50);
    }
  }, [value, enhanceLinks, enhanceImages]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
      
      // Enhance any links and images that may have been added
      setTimeout(() => {
        enhanceLinks();
        enhanceImages();
      }, 50);
    }
  }, [onChange, enhanceLinks, enhanceImages]);

  // Update toolbar state based on cursor position
  const updateToolbarState = useCallback(() => {
    if (!editorRef.current) return;

    try {
      // Get selection to check for lists manually
      const selection = window.getSelection();
      let unorderedList = false;
      let orderedList = false;
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node: Node | null = range.commonAncestorContainer;
        
        // Walk up the DOM tree to find list elements
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'UL') {
              unorderedList = true;
              break;
            } else if (element.tagName === 'OL') {
              orderedList = true;
              break;
            }
          }
          node = node.parentNode;
        }
      }

      setIsFormatted({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        unorderedList: unorderedList || document.queryCommandState('insertUnorderedList'),
        orderedList: orderedList || document.queryCommandState('insertOrderedList'),
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

  // Enhanced list creation function
  const createList = useCallback((listType: 'ul' | 'ol') => {
    if (disabled) return;
    
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Execute the appropriate command
    const command = listType === 'ul' ? 'insertUnorderedList' : 'insertOrderedList';
    
    try {
      // First, ensure we're focused on the editor
      editor.focus();
      
      // Execute the command
      document.execCommand(command, false);
      
      // Force update of the content to ensure proper list styling
      setTimeout(() => {
        // Find all lists and ensure they have proper styling
        const lists = editor.querySelectorAll('ul, ol');
        lists.forEach(list => {
          if (list.tagName.toLowerCase() === 'ul') {
            (list as HTMLElement).style.listStyleType = 'disc';
          } else {
            (list as HTMLElement).style.listStyleType = 'decimal';
          }
          (list as HTMLElement).style.paddingLeft = '1.5em';
          (list as HTMLElement).style.margin = '0.5em 0';
        });
        
        // Ensure list items have proper display
        const listItems = editor.querySelectorAll('li');
        listItems.forEach(li => {
          (li as HTMLElement).style.display = 'list-item';
          (li as HTMLElement).style.margin = '0.25em 0';
        });
        
        updateToolbarState();
        handleInput();
      }, 10);
      
    } catch (error) {
      console.warn('List creation failed:', error);
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHighlightColors, showImageSizes]);

  // Handle link insertion
  const insertLink = useCallback(() => {
    if (disabled) return;
    
    const url = prompt('Enter the URL:');
    if (url) {
      executeCommand('createLink', url);
      // Links will be enhanced automatically by handleInput
    }
  }, [disabled, executeCommand]);

  // Handle signature insertion
  const insertSignature = useCallback(() => {
    if (disabled || !signature) return;
    
    const editor = editorRef.current;
    if (!editor) return;

    // Insert signature at cursor position or at the end
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      // Create a temporary div to parse the signature HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = signature;
      
      // Insert the signature content
      const fragment = document.createDocumentFragment();
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      
      range.insertNode(fragment);
      
      // Move cursor to end of inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // If no selection, append to the end
      editor.innerHTML += signature;
    }
    
    // Trigger change event
    handleInput();
  }, [disabled, signature, handleInput]);

  // Gmail-compatible image processing - unified with email sending logic
  const createGmailCompatibleImage = useCallback((imageSrc: string, fileName: string, sizeValue: string) => {
    const sizeConfig = imageSizes.find(size => size.value === sizeValue) || imageSizes[1];
    
    // Create wrapper div for alignment control
    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'margin: 10px 0',
      'display: block'
    ].join('; ') + ';';
    
    // Create image element with Gmail-optimized attributes
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = fileName;
    
    // Gmail-compatible inline styles (removed margin: auto for alignment control)
    const styles = [
      `max-width: ${sizeConfig.width}`,
      `width: ${sizeConfig.value === 'full' ? '100%' : sizeConfig.width}`,
      'height: auto',
      'display: inline-block',
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
    
    // Append image to wrapper
    wrapper.appendChild(img);
    
    return wrapper;
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

  // Save selection before opening image menus/dialogs to prevent losing cursor position
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // IMPORTANT: Only save the range if it's inside the editor.
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        setSavedRange(range.cloneRange());
        return;
      }
    }
    // If no valid selection is found in the editor, clear it.
    setSavedRange(null);
  }, []);

  // Handle opening Price Request panel
  const handleOpenPriceRequest = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (disabled) {
      return;
    }
    
    // Call the prop function to open the panel
    onOpenPriceRequest?.();
  }, [disabled, onOpenPriceRequest]);

  // Handle opening the image size picker menu
  const handleImageMenuOpen = useCallback(() => {
    if (disabled) return;
    saveSelection();
    setShowImageSizes(true);
  }, [disabled, saveSelection]);

  // Handle image insertion
  const insertImage = useCallback(() => {
    if (disabled) return;
    // The selection range should have been saved by handleImageMenuOpen.
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
        // Create Gmail-compatible image wrapper
        const imageWrapper = createGmailCompatibleImage(imageSrc, file.name, selectedImageSize);

        // Restore focus and insert at saved position
        editorRef.current.focus();
        const selection = window.getSelection();
        if (savedRange && selection) {
          selection.removeAllRanges();
          selection.addRange(savedRange);

          const range = savedRange;
          range.deleteContents();
          range.insertNode(imageWrapper);

          // Move cursor after image wrapper
          range.setStartAfter(imageWrapper);
          range.setEndAfter(imageWrapper);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          // Fallback: append to end if no valid range was saved
          editorRef.current.appendChild(imageWrapper);
        }

        handleInput();
        setSavedRange(null); // Clear the saved range
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, [handleInput, selectedImageSize, createGmailCompatibleImage, savedRange]);

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
              // Create Gmail-compatible image wrapper
              const imageWrapper = createGmailCompatibleImage(imageSrc, 'Pasted image', selectedImageSize);
              
              // Insert image wrapper at cursor position
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(imageWrapper);
                
                // Move cursor after image wrapper
                range.setStartAfter(imageWrapper);
                range.setEndAfter(imageWrapper);
                selection.removeAllRanges();
                selection.addRange(range);
              } else {
                // Fallback: append to end
                editorRef.current.appendChild(imageWrapper);
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
    
    // Enhance any links that might have been pasted
    setTimeout(() => enhanceLinks(), 100);
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
      
      // Update inline styles for Gmail compatibility (no margin since wrapper handles alignment)
      const styles = [
        `max-width: ${sizeConfig.width}`,
        `width: ${sizeConfig.value === 'full' ? '100%' : sizeConfig.width}`,
        'height: auto',
        'display: inline-block',
        'border-radius: 4px',
        'box-sizing: border-box',
        'border: none',
        'vertical-align: top',
        'outline: none'
      ];
      
      imageElement.style.cssText = styles.join('; ') + ';';
      
      setSelectedImageSize(newSize);
      handleInput();
      
      console.log(`📐 Changed image size to: ${newSize}`);
    }
  }, [disabled, handleInput, imageSizes]);

  // Handle opening the URL image dialog
  const handleInsertImageUrl = useCallback(() => {
    if (disabled) return;
    saveSelection();
    setShowImageUrlDialog(true);
  }, [disabled, saveSelection]);

  // Handle file attachment
  const handleFileAttachment = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFileAttachment) {
      onFileAttachment(files);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileAttachment]);

  return (
    <>
      <div className={cn("overflow-hidden rich-text-editor", className)}>
      {/* Toolbar */}
      {compact ? (
        // Compact toolbar - single row, minimal buttons
        <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-200 bg-gray-50 rich-text-toolbar">
          <Toggle
            size="sm"
            pressed={isFormatted.bold}
            onPressedChange={() => executeCommand('bold')}
            disabled={disabled}
            title="Bold"
            className="h-6 w-6 p-0"
          >
            <Bold size={12} />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isFormatted.italic}
            onPressedChange={() => executeCommand('italic')}
            disabled={disabled}
            title="Italic"
            className="h-6 w-6 p-0"
          >
            <Italic size={12} />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isFormatted.underline}
            onPressedChange={() => executeCommand('underline')}
            disabled={disabled}
            title="Underline"
            className="h-6 w-6 p-0"
          >
            <Underline size={12} />
          </Toggle>
          
          <div className="w-px h-4 bg-gray-300 mx-1" />
          
          <Toggle
            size="sm"
            pressed={isFormatted.unorderedList}
            onPressedChange={() => createList('ul')}
            disabled={disabled}
            title="Bullet List"
            className="h-6 w-6 p-0"
          >
            <List size={12} />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isFormatted.orderedList}
            onPressedChange={() => createList('ol')}
            disabled={disabled}
            title="Numbered List"
            className="h-6 w-6 p-0"
          >
            <ListOrdered size={12} />
          </Toggle>
          
          <div className="w-px h-4 bg-gray-300 mx-1" />
          
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={insertLink}
            disabled={disabled}
            title="Insert Link"
            className="h-6 w-6 p-0"
          >
            <Link size={12} />
          </Button>
          
          {showFileAttachmentButton && onFileAttachment && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files && onFileAttachment) {
                    onFileAttachment(e.target.files);
                  }
                }}
                className="hidden"
                accept="*/*"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                title="Attach File"
                className="h-6 w-6 p-0"
              >
                <Paperclip size={12} />
              </Button>
            </>
          )}
        </div>
      ) : (
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
            onPressedChange={() => createList('ul')}
            disabled={disabled}
            title="Bullet List"
          >
            <List size={14} />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isFormatted.orderedList}
            onPressedChange={() => createList('ol')}
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
          
          {/* Signature Button */}
          {showSignatureButton && signature && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={insertSignature}
              disabled={disabled}
              title="Insert Signature"
              className="h-8 px-2"
            >
              <FileSignature size={14} />
            </Button>
          )}
          
          {/* Image with Size Picker */}
          <div className="relative image-size-picker">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleImageMenuOpen}
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
              </div>
            )}
          </div>
          
          {/* Globe Icon for URL Image */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleInsertImageUrl}
            disabled={disabled}
            title="Insert Image from URL"
            className="h-8 px-2"
          >
            <Globe size={14} />
          </Button>
          
          {/* File Attachment Button */}
          {showFileAttachmentButton && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleFileAttachment}
              disabled={disabled}
              title="Attach File (PDF, DOC, CSV, etc.)"
              className="h-8 px-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            >
              <Paperclip size={14} />
            </Button>
          )}
          
          {/* Price Request Button */}
          {showPriceRequestButton && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleOpenPriceRequest}
              disabled={disabled}
              title="Insert Price Request Table"
              className="h-8 px-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50"
            >
              <FileSpreadsheet size={14} />
            </Button>
          )}
        </div>
      </div>
      )}

      {/* URL Image Dialog */}
      {showImageUrlDialog && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Insert Image from URL</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size
                </label>
                <select
                  value={selectedImageSize}
                  onChange={(e) => setSelectedImageSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {imageSizes.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.name} ({size.width})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setSavedRange(null);
                    setShowImageUrlDialog(false);
                    setImageUrl('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (imageUrl && editorRef.current) {
                      const imageWrapper = createGmailCompatibleImage(imageUrl, 'URL Image', selectedImageSize);
                      
                      // Restore the saved selection range
                      if (savedRange && editorRef.current) {
                        const selection = window.getSelection();
                        selection?.removeAllRanges();
                        selection?.addRange(savedRange);
                        
                        const range = savedRange;
                        range.deleteContents();
                        range.insertNode(imageWrapper);
                        range.setStartAfter(imageWrapper);
                        range.setEndAfter(imageWrapper);
                        
                        // Update selection
                        if (selection) {
                          selection.removeAllRanges();
                          selection.addRange(range);
                        }
                      } else {
                        editorRef.current.appendChild(imageWrapper);
                      }
                      handleInput();
                      editorRef.current.focus();
                      setImageUrl('');
                      setShowImageUrlDialog(false);
                      setSavedRange(null);
                    }
                  }}
                  disabled={!imageUrl.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Insert Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        style={{ minHeight, fontSize: '12px' }}
        suppressContentEditableWarning={true}
      />
      
      {/* Hidden file input for images */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFile}
        style={{ display: 'none' }}
      />
      
      {/* Hidden file input for attachments */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar,.ppt,.pptx"
        onChange={handleFileSelect}
        multiple
        style={{ display: 'none' }}
      />
      </div>
    </>
  );
};

export default RichTextEditor;