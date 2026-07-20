import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SurveyBarChart = ({ data, title, dataKey1, dataKey2, label1, label2, color1 = "#3B82F6", color2 = "#10B981" }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={dataKey1} fill={color1} name={label1} />
          {dataKey2 && <Bar dataKey={dataKey2} fill={color2} name={label2} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SurveyBarChart;