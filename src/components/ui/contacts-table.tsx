"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { 
  Download, 
  Edit, 
  Trash2, 
  FileSpreadsheet
} from "lucide-react";
import { PONumberDisplay } from "./po-number-display";
import { Contact } from "../../services/contactsService";

interface ContactsTableProps {
  contacts: Contact[];
  loading?: boolean;
  onEditContact?: (contact: Contact) => void;
  onDeleteContact?: (contactId: string) => void;
  onDeleteSelected?: (contactIds: string[]) => void;
}

const allColumns = [
  "Select",
  "Full Name",
  "Address", 
  "City",
  "State",
  "Zip",
  "Tel 1",
  "Tel 2",
  "Email",
  "Contributors",
  "PO Number(s)",
  "Actions",
] as const;

function ContactsTable({ 
  contacts, 
  loading = false, 
  onEditContact,
  onDeleteContact,
  onDeleteSelected 
}: ContactsTableProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...allColumns]);
  const [searchFilter, setSearchFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [animatingActions, setAnimatingActions] = useState<Set<string>>(new Set());
  const [isExitingButtons, setIsExitingButtons] = useState(false);

  // Filter contacts based on search criteria
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchFilter || 
      contact.fullName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
      contact.orderNumbers.some(orderNum => 
        orderNum.toLowerCase().includes(searchFilter.toLowerCase())
      );
    
    const matchesCity = !cityFilter || 
      contact.city.toLowerCase().includes(cityFilter.toLowerCase());
    
    return matchesSearch && matchesCity;
  });

  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) =>
      prev.includes(col)
        ? prev.filter((c) => c !== col)
        : [...prev, col]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    } else {
      // Handle exit animation when deselecting all
      setIsExitingButtons(true);
      setTimeout(() => {
        setSelectedContacts(new Set());
        setIsExitingButtons(false);
      }, 300);
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    const newSelected = new Set(selectedContacts);
    if (checked) {
      newSelected.add(contactId);
    } else {
      newSelected.delete(contactId);
    }
    
    // Handle exit animation when going from some selected to none selected
    const wasSomeSelected = selectedContacts.size > 0;
    const willBeSomeSelected = newSelected.size > 0;
    
    if (wasSomeSelected && !willBeSomeSelected) {
      setIsExitingButtons(true);
      setTimeout(() => {
        setSelectedContacts(newSelected);
        setIsExitingButtons(false);
      }, 300);
    } else {
      setSelectedContacts(newSelected);
    }
  };

  const animateAction = (contactId: string, callback: () => void) => {
    setAnimatingActions(prev => new Set([...prev, contactId]));
    setTimeout(() => {
      callback();
      setAnimatingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
    }, 200);
  };

  const handleEdit = (contact: Contact) => {
    animateAction(contact.id, () => {
      onEditContact?.(contact);
    });
  };

  const handleDelete = (contactId: string) => {
    animateAction(contactId, () => {
      onDeleteContact?.(contactId);
    });
  };

  const exportToCSV = (contactsToExport: Contact[] = selectedContacts.size > 0 
    ? filteredContacts.filter(c => selectedContacts.has(c.id))
    : filteredContacts
  ) => {
    const headers = [
      'Full Name', 'Address', 'City', 'State', 'Zip', 
      'Tel 1', 'Tel 2', 'Email', 'Contributors', 'PO Numbers', 'Invoice Count'
    ];
    
    const csvContent = [
      headers.join(','),
      ...contactsToExport.map(contact => [
        `"${contact.fullName}"`,
        `"${contact.address}"`,
        `"${contact.city}"`,
        `"${contact.state}"`,
        `"${contact.zip}"`,
        `"${contact.tel1}"`,
        `"${contact.tel2}"`,
        `"${contact.email}"`,
        `"${(contact.contributors || []).map(c => c.name).join('; ')}"`,
        `"${(contact.poNumbers || []).map(po => typeof po === 'string' ? po : po.label).join('; ')}"`,
        `"${contact.invoiceCount || 0}"`
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAllSelected = filteredContacts.length > 0 && 
    filteredContacts.every(c => selectedContacts.has(c.id));
  const isSomeSelected = selectedContacts.size > 0;

  if (loading) {
    return (
      <div className="container my-8 space-y-4 p-4 border border-border rounded-lg bg-background shadow-sm overflow-x-auto">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400"></div>
          <span className="ml-3 text-gray-600">Loading contacts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-8 space-y-4 p-4 border border-border rounded-lg bg-background shadow-sm overflow-x-auto">
      {/* Action Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Search by name, email, PO number"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-64"
          />
          <Input
            placeholder="Filter by city..."
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-48"
          />
        </div>

        <div className="flex gap-2 items-center">
          {/* Export Buttons */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportToCSV()}
            className={`transition-all duration-300 hover:scale-105 active:scale-95 ${
              (isSomeSelected || isExitingButtons) ? 'transform -translate-x-2' : 'transform translate-x-0'
            }`}
          >
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          
          {(isSomeSelected || isExitingButtons) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportToCSV(filteredContacts.filter(c => selectedContacts.has(c.id)))}
              className={`transition-all duration-300 hover:scale-105 active:scale-95 ${
                isExitingButtons ? 'animate-bounce-down opacity-0 scale-95' : 'animate-bounce-up opacity-100'
              }`}
              style={{
                animation: isExitingButtons ? 'bounceDown 0.3s ease-in-out' : 'bounceUp 0.3s ease-in-out'
              }}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Selected ({selectedContacts.size})
            </Button>
          )}

          {/* Delete Selected */}
          {(isSomeSelected || isExitingButtons) && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => onDeleteSelected?.(Array.from(selectedContacts))}
              className={`transition-all duration-300 hover:scale-105 active:scale-95 ${
                isExitingButtons ? 'animate-bounce-down opacity-0 scale-95' : 'animate-bounce-up opacity-100'
              }`}
              style={{
                animation: isExitingButtons 
                  ? 'bounceDown 0.3s ease-in-out 0.1s both' 
                  : 'bounceUp 0.3s ease-in-out 0.1s both'
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedContacts.size})
            </Button>
          )}

          {/* Column Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              {allColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={visibleColumns.includes(col)}
                  onCheckedChange={() => toggleColumn(col)}
                >
                  {col}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Table className="w-full">
        <TableHeader>
          <TableRow>
            {visibleColumns.includes("Select") && (
              <TableHead className="w-[50px] text-xs">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all contacts"
                />
              </TableHead>
            )}
            {visibleColumns.includes("Full Name") && <TableHead className="w-[180px] text-xs">Full Name</TableHead>}
            {visibleColumns.includes("Address") && <TableHead className="w-[220px] text-xs">Address</TableHead>}
            {visibleColumns.includes("City") && <TableHead className="w-[120px] text-xs">City</TableHead>}
            {visibleColumns.includes("State") && <TableHead className="w-[80px] text-xs">State</TableHead>}
            {visibleColumns.includes("Zip") && <TableHead className="w-[80px] text-xs">Zip</TableHead>}
            {visibleColumns.includes("Tel 1") && <TableHead className="w-[120px] text-xs">Tel 1</TableHead>}
            {visibleColumns.includes("Tel 2") && <TableHead className="w-[120px] text-xs">Tel 2</TableHead>}
            {visibleColumns.includes("Email") && <TableHead className="w-[200px] text-xs">Email</TableHead>}
            {visibleColumns.includes("Contributors") && <TableHead className="w-[150px] text-xs">Contributors</TableHead>}
            {visibleColumns.includes("PO Number(s)") && <TableHead className="w-[150px] text-xs">PO Number(s)</TableHead>}
            {visibleColumns.includes("Actions") && <TableHead className="w-[100px] text-xs">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredContacts.length ? (
            filteredContacts.map((contact) => (
              <TableRow 
                key={contact.id}
                className={`transition-all duration-200 hover:bg-muted/50 ${
                  animatingActions.has(contact.id) ? 'animate-bounce-down scale-95' : ''
                }`}
              >
                {visibleColumns.includes("Select") && (
                  <TableCell>
                    <Checkbox
                      checked={selectedContacts.has(contact.id)}
                      onCheckedChange={(checked) => handleSelectContact(contact.id, checked as boolean)}
                      aria-label={`Select ${contact.fullName}`}
                    />
                  </TableCell>
                )}
                {visibleColumns.includes("Full Name") && (
                  <TableCell className="font-medium whitespace-nowrap">{contact.fullName}</TableCell>
                )}
                {visibleColumns.includes("Address") && (
                  <TableCell className="whitespace-nowrap">{contact.address}</TableCell>
                )}
                {visibleColumns.includes("City") && (
                  <TableCell className="whitespace-nowrap">{contact.city}</TableCell>
                )}
                {visibleColumns.includes("State") && (
                  <TableCell className="whitespace-nowrap">{contact.state}</TableCell>
                )}
                {visibleColumns.includes("Zip") && (
                  <TableCell className="whitespace-nowrap">{contact.zip}</TableCell>
                )}
                {visibleColumns.includes("Tel 1") && (
                  <TableCell className="whitespace-nowrap">{contact.tel1}</TableCell>
                )}
                {visibleColumns.includes("Tel 2") && (
                  <TableCell className="whitespace-nowrap">{contact.tel2}</TableCell>
                )}
                {visibleColumns.includes("Email") && (
                  <TableCell className="whitespace-nowrap">
                    {contact.email && (
                      <a 
                        href={`mailto:${contact.email}`}
                        className="text-blue-500 underline hover:text-blue-700"
                      >
                        {contact.email}
                      </a>
                    )}
                  </TableCell>
                )}
                {visibleColumns.includes("Contributors") && (
                  <TableCell className="min-w-[50px]">
                    <div className="flex -space-x-2">
                      <TooltipProvider>
                        {(contact.contributors || []).map((contributor, idx) => {
                          // Generate a consistent color based on the contributor's name
                          const colors = [
                            'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
                            'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'
                          ];
                          const colorIndex = contributor.name.charCodeAt(0) % colors.length;
                          const bgColor = colors[colorIndex];
                          
                          return (
                            <Tooltip key={idx}>
                              <TooltipTrigger asChild>
                                <Avatar className={`h-8 w-8 ring-2 ring-white hover:z-10 ${bgColor}`}>
                                  <AvatarImage src="" alt={contributor.name} />
                                  <AvatarFallback className={`text-xs font-semibold text-white ${bgColor}`}>
                                    {contributor.initials}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent className="text-sm">
                                <p className="font-semibold">{contributor.name}</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </TooltipProvider>
                    </div>
                  </TableCell>
                )}
                {visibleColumns.includes("PO Number(s)") && (
                  <TableCell className="whitespace-nowrap">
                    <PONumberDisplay 
                      poNumbers={contact.poNumbers || contact.orderNumbers || []}
                      className="flex items-center"
                    />
                  </TableCell>
                )}
                {visibleColumns.includes("Actions") && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(contact)}
                        className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110 active:scale-95"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(contact.id)}
                        className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110 active:scale-95 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="text-center py-6">
                No contacts found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default ContactsTable;
