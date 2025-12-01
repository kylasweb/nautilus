
import React, { useState } from 'react';
import { ShipperContact } from '../types';
import { Card } from './ui/Card';

interface ShipperContactsProps {
  contacts: ShipperContact[];
  onUpdateContact: (contact: ShipperContact) => void;
}

export const ShipperContacts: React.FC<ShipperContactsProps> = ({ contacts, onUpdateContact }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ShipperContact | null>(null);

  const filteredContacts = contacts.filter(c => 
    c.shipperName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contactPersonName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (contact: ShipperContact) => {
    setEditingContact({ ...contact }); // Clone to avoid direct mutation
    setIsEditModalOpen(true);
  };

  const handleSave = () => {
    if (editingContact) {
      onUpdateContact({
        ...editingContact,
        lastUpdated: new Date().toISOString()
      });
      setIsEditModalOpen(false);
      setEditingContact(null);
    }
  };

  const handleChange = (field: keyof ShipperContact, value: string) => {
    if (editingContact) {
      // @ts-ignore
      setEditingContact({ ...editingContact, [field]: value });
    }
  };

  return (
    <>
      <Card title="Shipper Contact Management" subtitle="Manage detailed KYC and contact info">
        <div className="mb-4">
          <div className="relative rounded-md shadow-sm max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md border p-2"
              placeholder="Search by Shipper or Contact Person..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Shipper Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Company Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact Person</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Mobile / Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredContacts.map((contact) => (
                <tr key={contact.shipperName} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">{contact.shipperName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contact.customerType ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                     }`}>
                        {contact.customerType || 'N/A'}
                     </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contact.companySize === 'Ultra Large' ? 'bg-indigo-100 text-indigo-800' :
                        contact.companySize === 'Large' ? 'bg-blue-100 text-blue-800' :
                        contact.companySize === 'SME' ? 'bg-teal-100 text-teal-800' :
                        'bg-slate-100 text-slate-600'
                     }`}>
                        {contact.companySize || 'N/A'}
                     </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{contact.contactPersonName || '-'}</div>
                    <div className="text-xs text-slate-500">{contact.designation}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="text-slate-900">{contact.contactNumber || '-'}</div>
                    <div className="text-slate-500 text-xs">{contact.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     {(!contact.email || !contact.panNumber) ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                           Incomplete
                        </span>
                     ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                           Active
                        </span>
                     )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => startEdit(contact)}
                      className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal / Overlay Form */}
      {isEditModalOpen && editingContact && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsEditModalOpen(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 border-b pb-2 mb-4" id="modal-title">
                      Edit Shipper Details: <span className="text-blue-600">{editingContact.shipperName}</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Company Details */}
                        <div className="col-span-1 md:col-span-2">
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Information</h4>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Customer Type</label>
                            <select 
                                value={editingContact.customerType}
                                onChange={(e) => handleChange('customerType', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value="">Select Type</option>
                                <option value="Partnership">Partnership</option>
                                <option value="Pvt Ltd">Pvt Ltd</option>
                                <option value="LLP">LLP</option>
                                <option value="Limited">Limited</option>
                                <option value="Proprietorship">Proprietorship</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Company Size</label>
                            <select 
                                value={editingContact.companySize}
                                onChange={(e) => handleChange('companySize', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value="">Select Size</option>
                                <option value="SME">SME</option>
                                <option value="Large">Large</option>
                                <option value="Ultra Large">Ultra Large</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                            <input 
                                type="text" 
                                value={editingContact.panNumber} 
                                onChange={(e) => handleChange('panNumber', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">CIN Number</label>
                            <input 
                                type="text" 
                                value={editingContact.cinNumber} 
                                onChange={(e) => handleChange('cinNumber', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            <textarea 
                                value={editingContact.address} 
                                onChange={(e) => handleChange('address', e.target.value)}
                                rows={2}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                            />
                        </div>

                        {/* Contact Person Details */}
                        <div className="col-span-1 md:col-span-2 mt-2">
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Key Contact Person</h4>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                            <input 
                                type="text" 
                                value={editingContact.contactPersonName} 
                                onChange={(e) => handleChange('contactPersonName', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Designation</label>
                            <input 
                                type="text" 
                                value={editingContact.designation} 
                                onChange={(e) => handleChange('designation', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email ID</label>
                            <input 
                                type="email" 
                                value={editingContact.email} 
                                onChange={(e) => handleChange('email', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                            <input 
                                type="text" 
                                value={editingContact.contactNumber} 
                                onChange={(e) => handleChange('contactNumber', e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                            />
                        </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                    type="button" 
                    onClick={handleSave}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save Changes
                </button>
                <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
