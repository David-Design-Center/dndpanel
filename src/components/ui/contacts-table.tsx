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
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface Contact {
  id: string;
  fullName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  tel1: string;
  tel2: string;
  email: string;
  contributors: {
    name: string;
    initials: string;
  }[];
  orderNumbers: string[];
}

interface ContactsTableProps {
  contacts: Contact[];
  loading?: boolean;
}

const allColumns = [
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
] as const;

function ContactsTable({ contacts, loading = false }: ContactsTableProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...allColumns]);
  const [searchFilter, setSearchFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const filteredData = contacts.filter((contact) => {
    return (
      (!searchFilter || 
        contact.fullName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchFilter.toLowerCase()) ||
        contact.orderNumbers.some(order => order.toLowerCase().includes(searchFilter.toLowerCase()))
      ) &&
      (!cityFilter || contact.city.toLowerCase().includes(cityFilter.toLowerCase()))
    );
  });

  const toggleColumn = (col: string) => {
    setVisibleColumns((prev) =>
      prev.includes(col)
        ? prev.filter((c) => c !== col)
        : [...prev, col]
    );
  };

  if (loading) {
    return (
      <div className="container my-10 space-y-4 p-4 border border-border rounded-lg bg-background shadow-sm overflow-x-auto">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400"></div>
          <span className="ml-3 text-gray-600">Loading contacts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-10 space-y-4 p-4 border border-border rounded-lg bg-background shadow-sm overflow-x-auto">
      <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Search by name, email, or order..."
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

      <Table className="w-full">
        <TableHeader>
          <TableRow>
            {visibleColumns.includes("Full Name") && <TableHead className="w-[180px]">Full Name</TableHead>}
            {visibleColumns.includes("Address") && <TableHead className="w-[220px]">Address</TableHead>}
            {visibleColumns.includes("City") && <TableHead className="w-[120px]">City</TableHead>}
            {visibleColumns.includes("State") && <TableHead className="w-[80px]">State</TableHead>}
            {visibleColumns.includes("Zip") && <TableHead className="w-[80px]">Zip</TableHead>}
            {visibleColumns.includes("Tel 1") && <TableHead className="w-[120px]">Tel 1</TableHead>}
            {visibleColumns.includes("Tel 2") && <TableHead className="w-[120px]">Tel 2</TableHead>}
            {visibleColumns.includes("Email") && <TableHead className="w-[200px]">Email</TableHead>}
            {visibleColumns.includes("Contributors") && <TableHead className="w-[150px]">Contributors</TableHead>}
            {visibleColumns.includes("PO Number(s)") && <TableHead className="w-[150px]">PO Number(s)</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length ? (
            filteredData.map((contact) => (
              <TableRow key={contact.id}>
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
                    <a 
                      href={`mailto:${contact.email}`}
                      className="text-blue-500 underline hover:text-blue-700"
                    >
                      {contact.email}
                    </a>
                  </TableCell>
                )}
                {visibleColumns.includes("Contributors") && (
                  <TableCell className="min-w-[120px]">
                    <div className="flex -space-x-2">
                      <TooltipProvider>
                        {contact.contributors.map((contributor, idx) => (
                          <Tooltip key={idx}>
                            <TooltipTrigger asChild>
                              <Avatar className="h-8 w-8 ring-2 ring-white hover:z-10">
                                <AvatarImage src="" alt={contributor.name} />
                                <AvatarFallback className="text-xs font-semibold">
                                  {contributor.initials}
                                </AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent className="text-sm">
                              <p className="font-semibold">{contributor.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </TooltipProvider>
                    </div>
                  </TableCell>
                )}
                {visibleColumns.includes("PO Number(s)") && (
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {contact.orderNumbers.map((orderNum, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs"
                        >
                          {orderNum}
                        </Badge>
                      ))}
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
