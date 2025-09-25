'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, Edit3, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Invoice {
  id: string;
  name: string;
  price: string;
  date: string;
  orderNumber: string;
  description?: string;
  items?: string[];
}

interface InvoiceEdit {
  id: string;
  originalInvoice: Invoice;
  editedInvoice?: Invoice;
  editReason?: string;
  editDate?: string;
}

interface InvoiceCardsProps {
  invoices: InvoiceEdit[];
  className?: string;
  onEditInvoice?: (invoiceId: string) => void;
  onDeleteInvoice?: (invoiceId: string, orderNumber: string) => void;
  showDeleteButton?: boolean;
  deletingInvoice?: string | null;
  hidePrice?: boolean;
  dataSource?: 'invoices' | 'orders'; // Specify which tables to query
}

interface MousePos {
  readonly x: number;
  readonly y: number;
}

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    rotateX: -15,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
      mass: 0.8,
    },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const InvoiceSlot: React.FC<{
  invoice: Invoice;
  isEdited?: boolean;
  mousePos: MousePos;
  hovered: boolean;
  onPreview?: () => void;
}> = ({ invoice, isEdited = false, mousePos, hovered, onPreview }) => {
  return (
    <motion.div
      className={cn(
        'relative h-full rounded-lg overflow-hidden cursor-pointer',
        isEdited ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-slate-700 to-slate-800'
      )}
      animate={{
        rotateY: hovered ? (isEdited ? mousePos.x * 0.2 : -mousePos.x * 0.2) : 0,
        rotateX: hovered ? -mousePos.y * 0.1 : 0,
        z: hovered ? 10 : 0,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ transformStyle: 'preserve-3d' }}
      onClick={onPreview}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <defs>
            <pattern
              id={`pattern-${invoice.id}-${isEdited ? 'edited' : 'original'}`}
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.3" />
            </pattern>
          </defs>
          <rect
            width="100"
            height="100"
            fill={`url(#pattern-${invoice.id}-${isEdited ? 'edited' : 'original'})`}
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 p-3 h-full flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <motion.div
            className={cn(
              'p-1 rounded',
              isEdited ? 'bg-white/20' : 'bg-white/10'
            )}
          >
            {isEdited ? <Edit3 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
          </motion.div>
        </div>

        {/* Invoice Details */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-1">
            <span className="text-xs truncate">{invoice.date}</span>
          </div>
          {invoice.description && (
            <p className="text-[11px] leading-tight text-white/80 line-clamp-3">
              {invoice.description}
            </p>
          )}
          {invoice.items && invoice.items.length > 0 && (
            <ul className="space-y-1 text-[10px] text-white/80">
              {invoice.items.slice(0, 3).map((item, idx) => (
                <li key={idx} className="truncate">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="mt-2 pt-2 border-t border-white/20">
          <p className="text-xs opacity-70 truncate">
            {isEdited ? 'Edited' : 'Original'}
          </p>
        </div>
      </div>

      {/* 3D Border Effect */}
      <motion.div
        className="absolute inset-0 rounded-lg border border-white/20"
        animate={{ opacity: hovered ? 1 : 0.5 }}
        transition={{ duration: 0.3 }}
        style={{ transform: 'translateZ(1px)' }}
      />
    </motion.div>
  );
};

const InvoiceCard: React.FC<{ 
  invoiceEdit: InvoiceEdit; 
  onEditInvoice?: (invoiceId: string) => void;
  onPreviewInvoice?: (invoiceId: string) => void;
  onDeleteInvoice?: (invoiceId: string, orderNumber: string) => void;
  showDeleteButton?: boolean;
  deletingInvoice?: string | null;
  hidePrice?: boolean;
}> = ({ invoiceEdit, onEditInvoice, onPreviewInvoice, onDeleteInvoice, showDeleteButton = false, deletingInvoice, hidePrice = false }) => {
  const [mousePos, setMousePos] = useState<MousePos>({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({
      x: (x / rect.width - 0.5) * 10,
      y: (y / rect.height - 0.5) * 10,
    });
  }, []);

  const handleEnter = useCallback(() => setHovered(true), []);
  const handleLeave = useCallback(() => {
    setHovered(false);
    setMousePos({ x: 0, y: 0 });
  }, []);

  const handleEditClick = useCallback(() => {
    if (onEditInvoice) {
      onEditInvoice(invoiceEdit.originalInvoice.id);
    }
  }, [onEditInvoice, invoiceEdit.originalInvoice.id]);

  return (
    <motion.div
      variants={cardVariants}
      className="w-full"
      style={{ perspective: '600px' }}
    >
      {/* Compact Invoice Card Container */}
      <motion.div
        className="bg-white dark:bg-slate-900 rounded-lg overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700"
        onMouseMove={handleMove}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-3 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white truncate">
                {invoiceEdit.originalInvoice.name}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-slate-300 mt-1">
                {!hidePrice && (
                  <span className="flex items-center space-x-1">
                    <span>{invoiceEdit.originalInvoice.price}</span>
                  </span>
                )}
                {invoiceEdit.originalInvoice.orderNumber && (
                  <span className="font-mono">#{invoiceEdit.originalInvoice.orderNumber}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Slots Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 h-32">
          {/* Original Invoice Slot */}
          <InvoiceSlot
            invoice={invoiceEdit.originalInvoice}
            isEdited={false}
            mousePos={mousePos}
            hovered={hovered}
            onPreview={() => onPreviewInvoice?.(invoiceEdit.originalInvoice.id)}
          />

          {/* Edited Invoice Slot */}
          {invoiceEdit.editedInvoice ? (
            <InvoiceSlot
              invoice={invoiceEdit.editedInvoice}
              isEdited={true}
              mousePos={mousePos}
              hovered={hovered}
              onPreview={() => onPreviewInvoice?.(invoiceEdit.editedInvoice!.id)}
            />
          ) : (
            <motion.button
              className="relative h-full rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center w-full bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              onClick={handleEditClick}
              animate={{
                rotateY: hovered ? mousePos.x * 0.2 : 0,
                rotateX: hovered ? -mousePos.y * 0.1 : 0,
                z: hovered ? 5 : 0,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ transformStyle: 'preserve-3d' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-center text-slate-500 dark:text-slate-400">
                <Edit3 className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">Edit Invoice</p>
              </div>
            </motion.button>
          )}
        </div>
      </motion.div>
      
      {/* Delete Button - Only visible for David */}
      {showDeleteButton && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => onDeleteInvoice?.(invoiceEdit.originalInvoice.id, invoiceEdit.originalInvoice.orderNumber)}
            disabled={deletingInvoice === invoiceEdit.originalInvoice.id}
            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            title="Delete Invoice"
          >
            <Trash2 size={12} className="mr-1" />
            {deletingInvoice === invoiceEdit.originalInvoice.id ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      )}
    </motion.div>
  );
};

export function InvoiceCards({ 
  invoices, 
  className, 
  onEditInvoice, 
  onDeleteInvoice, 
  showDeleteButton = false, 
  deletingInvoice,
  hidePrice = false,
  dataSource = 'invoices'
}: InvoiceCardsProps) {
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    invoice: any;
    lineItems: any[];
  }>({
    isOpen: false,
    invoice: null,
    lineItems: []
  });

  const fetchInvoiceDetails = async (invoiceId: string) => {
    try {
      if (dataSource === 'orders') {
        // Fetch order details with supplier info
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*, suppliers(*)')
          .eq('id', invoiceId)
          .single();

        if (orderError) throw orderError;

        // Fetch order line items
        const { data: lineItemsData, error: lineItemsError } = await supabase
          .from('orders_line_items')
          .select('*')
          .eq('order_id', invoiceId);

        if (lineItemsError) throw lineItemsError;

        return { invoice: orderData, lineItems: lineItemsData || [] };
      } else {
        // Fetch invoice details (default behavior)
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();

        if (invoiceError) throw invoiceError;

        // Fetch line items
        const { data: lineItemsData, error: lineItemsError } = await supabase
          .from('invoice_line_items')
          .select('*')
          .eq('invoice_id', invoiceId);

        if (lineItemsError) throw lineItemsError;

        return { invoice: invoiceData, lineItems: lineItemsData || [] };
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      return null;
    }
  };

  const handlePreviewInvoice = async (invoiceId: string) => {
    const details = await fetchInvoiceDetails(invoiceId);
    if (details) {
      setPreviewModal({
        isOpen: true,
        invoice: details.invoice,
        lineItems: details.lineItems
      });
    }
  };

  const closePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      invoice: null,
      lineItems: []
    });
  };
  return (
    <div className={cn('max-w-full mx-auto p-6', className)}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        {invoices.map((invoiceEdit, index) => (
          <motion.div
            key={invoiceEdit.id}
            variants={cardVariants}
            custom={index}
          >
            <InvoiceCard 
              invoiceEdit={invoiceEdit} 
              onEditInvoice={onEditInvoice} 
              onPreviewInvoice={handlePreviewInvoice}
              onDeleteInvoice={onDeleteInvoice}
              showDeleteButton={showDeleteButton}
              deletingInvoice={deletingInvoice}
              hidePrice={hidePrice}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Preview Modal - Rendered at top level to take full screen */}
      {previewModal.invoice && (
        <InvoicePreviewModal
          isOpen={previewModal.isOpen}
          onClose={closePreviewModal}
          invoice={previewModal.invoice}
          lineItems={previewModal.lineItems}
          dataSource={dataSource}
        />
      )}
    </div>
  );
}
