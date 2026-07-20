import React from 'react';

const StatisticsCard = ({ title, value, subtitle, icon: Icon, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    red: "bg-red-50 text-red-600 border-red-200"
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <div className="flex items-center">
        {Icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]} mr-4`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default StatisticsCard;