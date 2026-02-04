import React from 'react';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';

interface StatsChartProps {
  title: string;
  data: Record<string, number>;
  type: 'bar' | 'pie' | 'line';
  color?: string;
}

const StatsChart: React.FC<StatsChartProps> = ({ 
  title, 
  data, 
  type, 
  color = 'indigo' 
}) => {
  const maxValue = Math.max(...Object.values(data));
  const total = Object.values(data).reduce((sum, value) => sum + value, 0);

  const colorClasses = {
    indigo: 'bg-indigo-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    yellow: 'bg-yellow-500'
  };

  if (type === 'bar') {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="space-y-3">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-300 truncate flex-1 mr-3">{key}</span>
              <div className="flex items-center space-x-2 flex-1">
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}
                    style={{ width: `${(value / maxValue) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-white w-8 text-right">
                  {value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'pie') {
    return (
      <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) => {
            const percentage = ((value / total) * 100).toFixed(1);
            return (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}></div>
                  <span className="text-sm text-gray-300">{key}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-white">{value}</span>
                  <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Line chart (simplified as bars for now)
  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <Calendar className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="flex items-end space-x-2 h-32">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full ${colorClasses[color as keyof typeof colorClasses]} rounded-t`}
              style={{ height: `${(value / maxValue) * 100}%` }}
            ></div>
            <span className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-left">
              {key}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsChart;