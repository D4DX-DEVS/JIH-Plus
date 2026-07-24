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
    <div className="bg-white p-2.5 sm:p-6 rounded-lg shadow border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-0">
        {Icon && (
          <div className={`p-1.5 sm:p-3 rounded-lg ${colorClasses[color]} sm:mr-4 flex-shrink-0`}>
            <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] sm:text-sm font-medium text-gray-600 leading-tight">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-[10px] sm:text-sm text-gray-500 leading-tight">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default StatisticsCard;