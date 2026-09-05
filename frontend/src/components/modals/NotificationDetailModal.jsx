import React from 'react';
import { X, Bell, Calendar, User, MapPin, Building, Landmark } from 'lucide-react';

const NotificationDetailModal = ({ isOpen, onClose, notification }) => {
  if (!isOpen || !notification) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const { recipients = {} } = notification;
  const hasDistrict = Boolean(recipients.district?.districtName);
  const areas = recipients.areas || [];
  const units = recipients.units || [];
  const hasAnyRecipients = hasDistrict || areas.length > 0 || units.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-auto border border-gray-200 max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b bg-gradient-to-r from-[#002349]/5 to-[#957C3D]/5 flex-shrink-0">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#002349] text-white">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#002349] break-words">{notification.title}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(notification.createdAt)}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto space-y-5">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4 text-gray-400" />
              <span>From: <span className="font-semibold text-gray-800">{notification.senderName}</span></span>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-xl p-3">
                {notification.description}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Recipients</p>
              {!hasAnyRecipients ? (
                <p className="text-sm text-gray-500">No recipients recorded.</p>
              ) : (
                <div className="space-y-3">
                  {hasDistrict && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                        <Landmark className="w-3.5 h-3.5" />
                        District
                      </div>
                      <span className="inline-block text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                        {recipients.district.districtName}
                      </span>
                    </div>
                  )}

                  {areas.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                        <MapPin className="w-3.5 h-3.5" />
                        Areas ({areas.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {areas.map((area, idx) => (
                          <span key={area.areaId || idx} className="text-xs font-medium bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full">
                            {area.areaName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {units.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                        <Building className="w-3.5 h-3.5" />
                        Units ({units.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {units.map((unit, idx) => (
                          <span key={unit.unitId || idx} className="text-xs font-medium bg-green-50 text-green-700 px-2.5 py-1 rounded-full">
                            {unit.unitName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-300 font-semibold text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetailModal;
