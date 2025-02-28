import React from 'react';

const CategoryFilter = ({ categories, activeCategories, onChange }) => {
  const handleCategoryToggle = (category) => {
    onChange({
      ...activeCategories,
      [category]: !activeCategories[category]
    });
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <div className="mr-3 font-medium">Filter by category:</div>
      {Object.keys(categories).map((category) => (
        <button
          key={category}
          onClick={() => handleCategoryToggle(category)}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium
            transition-all duration-200 ease-in-out
            ${activeCategories[category] 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
          `}
        >
          {categories[category]}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;