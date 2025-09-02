import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Contact } from "../../services/contactsService";

interface ContactFormData {
  fullName: string;
  email?: string;
  phone1?: string;
  phone2?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface EditContactModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedContact: any) => Promise<void>;
}

export function EditContactModal({ contact, isOpen, onClose, onSave }: EditContactModalProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    fullName: '',
    email: '',
    phone1: '',
    phone2: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contact) {
      // Editing existing contact
      setFormData({
        fullName: contact.fullName,
        email: contact.email,
        phone1: contact.tel1,
        phone2: contact.tel2,
        address: contact.address,
        city: contact.city,
        state: contact.state,
        zipCode: contact.zip,
      });
    } else {
      // Creating new contact - reset form
      setFormData({
        fullName: '',
        email: '',
        phone1: '',
        phone2: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
      });
    }
    setError(null);
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const contactData = {
        id: contact?.id || undefined, // undefined for new contacts
        fullName: formData.fullName,
        email: formData.email || '',
        phone1: formData.phone1 || '',
        phone2: formData.phone2 || '',
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        zipCode: formData.zipCode || '',
      };
      
      // Call the save function and wait for it to complete
      await onSave(contactData);
      onClose();
    } catch (err) {
      console.error('Error saving contact:', err);
      setError(contact ? 'Failed to update contact. Please try again.' : 'Failed to create contact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] animate-bounce-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {contact ? 'Edit Contact' : 'Create New Contact'}
            {contact && (
              <span className="text-sm font-normal text-gray-500">
                ({contact.orderNumbers?.length || 0} orders)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                required
                className="transition-all duration-200 focus:scale-105"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="transition-all duration-200 focus:scale-105"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="phone1">Phone 1</Label>
                <Input
                  id="phone1"
                  value={formData.phone1}
                  onChange={(e) => handleInputChange('phone1', e.target.value)}
                  className="transition-all duration-200 focus:scale-105"
                />
              </div>
              <div>
                <Label htmlFor="phone2">Phone 2</Label>
                <Input
                  id="phone2"
                  value={formData.phone2}
                  onChange={(e) => handleInputChange('phone2', e.target.value)}
                  className="transition-all duration-200 focus:scale-105"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="transition-all duration-200 focus:scale-105"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="transition-all duration-200 focus:scale-105"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="transition-all duration-200 focus:scale-105"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">Zip</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  className="transition-all duration-200 focus:scale-105"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded-md animate-bounce-in">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="transition-all duration-200 hover:scale-105"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="transition-all duration-200 hover:scale-105 active:animate-bounce-down"
            >
              {loading ? 'Saving...' : (contact ? 'Save Changes' : 'Create Contact')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
