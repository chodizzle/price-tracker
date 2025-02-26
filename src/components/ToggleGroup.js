import React from 'react';

const ToggleButton = ({ active, onClick, color, label }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg
        transition-all duration-200 ease-in-out
        ${active 
          ? 'bg-white shadow-md border border-gray-200' 
          : 'bg-gray-100 hover:bg-gray-200'
        }
      `}
    >
      <div 
        className="w-3 h-3 rounded-full" 
        style={{ backgroundColor: color }}
      />
      <span className={`
        font-medium text-sm
        ${active ? 'text-gray-900' : 'text-gray-600'}
      `}>
        {label}
      </span>
    </button>
  );
};

const ToggleGroup = ({ options, className = '' }) => {
  return (
    <div className={`flex gap-3 ${className}`}>
      {options.map((option) => (
        <ToggleButton
          key={option.id}
          active={option.active}
          onClick={option.onClick}
          color={option.color}
          label={option.label}
        />
      ))}
    </div>
  );
};

export default ToggleGroup;