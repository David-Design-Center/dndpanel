"use client";

import React, { useState } from "react";
import { FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InvoicePreviewModal } from "../invoice/InvoicePreviewModal";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface PONumberInfo {
  id: string;
  poNumber: string;
  label: string;
  isEdited: boolean;
  createdAt: string;
}

interface PONumberDisplayProps {
  poNumbers: PONumberInfo[] | string[]; // Support both new and legacy formats
  className?: string;
}

export const PONumberDisplay = ({ poNumbers, className }: PONumberDisplayProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    invoice: any;
    lineItems: any[];
  }>({
    isOpen: false,
    invoice: null,
    lineItems: []
  });

  // Normalize poNumbers to always work with PONumberInfo objects
  const normalizedPONumbers: PONumberInfo[] = poNumbers.map((po, index) => {
    if (typeof po === 'string') {
      // Legacy format - convert string to PONumberInfo
      return {
        id: `legacy-${index}`,
        poNumber: po,
        label: po,
        isEdited: false,
        createdAt: new Date().toISOString()
      };
    }
    return po; // Already PONumberInfo object
  });

  const fetchInvoiceByPO = async (poNumber: string, invoiceId?: string) => {
    try {
      let targetInvoice;
      
      if (invoiceId && invoiceId !== `legacy-${poNumber}`) {
        // If we have a specific invoice ID, fetch that directly (for edited invoices)
        const { data: specificInvoice, error: specificError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();

        if (!specificError && specificInvoice) {
          targetInvoice = specificInvoice;
          console.log(`Found invoice by ID ${invoiceId}:`, {
            id: targetInvoice.id,
            poNumber: targetInvoice.po_number,
            isEdited: !!targetInvoice.original_invoice_id
          });
        }
      }
      
      if (!targetInvoice) {
        // Fallback to PO number search (original logic)
        const { data: invoicesData, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('po_number', poNumber)
          .order('created_at', { ascending: false });

        if (invoiceError || !invoicesData || invoicesData.length === 0) {
          console.error('No invoices found for PO:', poNumber);
          return null;
        }

        // Priority logic: prefer non-edited version if no specific ID provided
        targetInvoice = invoicesData.find(inv => !inv.original_invoice_id) || invoicesData[0];
        
        console.log(`Found ${invoicesData.length} invoice(s) for PO ${poNumber}, using:`, {
          id: targetInvoice.id,
          isEdited: !!targetInvoice.original_invoice_id,
          createdAt: targetInvoice.created_at
        });
      }

      // Fetch line items for the selected invoice
      const { data: lineItemsData, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', targetInvoice.id);

      if (lineItemsError) throw lineItemsError;

      return { invoice: targetInvoice, lineItems: lineItemsData || [] };
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      return null;
    }
  };

  const handlePreviewInvoice = async (poInfo: PONumberInfo) => {
    setIsLoading(true);
    try {
      const details = await fetchInvoiceByPO(poInfo.poNumber, poInfo.id);
      if (details) {
        setPreviewModal({
          isOpen: true,
          invoice: details.invoice,
          lineItems: details.lineItems
        });
      } else {
        // Show a toast or alert that no invoice was found
        alert(`No invoice found for PO number: ${poInfo.poNumber}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const closePreviewModal = () => {
    setPreviewModal({
      isOpen: false,
      invoice: null,
      lineItems: []
    });
  };

  if (!poNumbers || poNumbers.length === 0) {
    return (
      <div className="flex items-center text-xs text-gray-400">
        <div className="relative">
          <div
            className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <FileText className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        <span className="ml-2">No Invoices</span>
      </div>
    );
  }

  const getBackgroundStyle = (): React.CSSProperties => {
    return { 
      background: "linear-gradient(hsl(223, 90%, 50%), hsl(208, 90%, 50%))",
    };
  };

  return (
    <div 
      className={`relative inline-block ${className || ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glass Icon with Counter */}
      <div
        className="relative bg-transparent outline-none w-10 h-10 [perspective:24em] [transform-style:preserve-3d] group cursor-pointer"
      >
        {/* Back layer */}
        <span
          className="absolute top-0 left-0 w-full h-full rounded-lg block transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] origin-[100%_100%] rotate-[8deg] group-hover:[transform:rotate(15deg)_translate3d(-0.25em,-0.25em,0.25em)]"
          style={{
            ...getBackgroundStyle(),
            boxShadow: "0.25em -0.25em 0.5em hsla(223, 10%, 10%, 0.15)",
          }}
        ></span>

        {/* Front layer */}
        <span
          className="absolute top-0 left-0 w-full h-full rounded-lg bg-[hsla(0,0%,100%,0.15)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] origin-[80%_50%] flex backdrop-blur-[0.75em] [-webkit-backdrop-filter:blur(0.75em)] transform group-hover:[transform:translateZ(1em)]"
          style={{
            boxShadow: "0 0 0 0.1em hsla(0, 0%, 100%, 0.3) inset",
          }}
        >
          <span
            className="m-auto flex items-center justify-center relative"
            aria-hidden="true"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <FileText className="h-4 w-4 text-white" />
            )}
            {/* Smaller counter badge */}
            <span className="absolute -top-0.5 -right-0.5 bg-white text-blue-600 text-[10px] font-bold rounded-full w-3 h-3 flex items-center justify-center shadow-sm">
              {normalizedPONumbers.length}
            </span>
          </span>
        </span>
      </div>

      {/* Hover Dropdown - positioned right below the icon */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ y: 5, scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 5, scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute z-[9999] left-0 top-12 w-40 p-2 bg-white rounded-lg shadow-xl border border-gray-200 ${
              isLoading ? 'pointer-events-none' : ''
            }`}
            style={{
              transform: 'translateX(-50%)',
              left: '10%'
            }}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center z-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"
                />
              </div>
            )}
            <div className="text-xs font-medium text-gray-600 mb-2">PO Numbers:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {normalizedPONumbers.map((poInfo, index) => (
                <motion.button
                  key={`${poInfo.poNumber}-${poInfo.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  disabled={isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Left click opens invoice preview, right click copies to clipboard
                    if (e.type === 'click') {
                      handlePreviewInvoice(poInfo);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(poInfo.poNumber);
                  }}
                  className={`w-full text-left px-2 py-1 text-xs rounded transition-colors duration-150 flex items-center gap-2 ${
                    isLoading 
                      ? 'text-gray-400 bg-gray-50 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                  title={`Click to preview ${poInfo.isEdited ? 'edited' : 'original'} invoice`}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full flex-shrink-0"
                    />
                  ) : (
                    <FileText className={`h-3 w-3 flex-shrink-0 ${poInfo.isEdited ? 'text-orange-500' : ''}`} />
                  )}
                  <span className="truncate">{poInfo.label}</span>
                  {poInfo.isEdited && (
                    <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded-full ml-auto">
                      EDIT
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Preview Modal */}
      {previewModal.invoice && (
        <InvoicePreviewModal
          isOpen={previewModal.isOpen}
          onClose={closePreviewModal}
          invoice={previewModal.invoice}
          lineItems={previewModal.lineItems}
        />
      )}
    </div>
  );
};
