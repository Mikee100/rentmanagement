import { useState, useMemo } from 'react';

export const useTable = (data, options = {}) => {
  const {
    initialPageSize = 25,
    initialSortField = null,
    initialSortOrder = 'asc'
  } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [sortField, setSortField] = useState(initialSortField);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Filter and search
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => {
        // Check all fields including nested objects
        const searchableFields = [
          item.tenant?.firstName,
          item.tenant?.lastName,
          item.tenant?.email,
          item.house?.houseNumber,
          item.house?.apartment?.name,
          item.paymentMethod,
          item.status,
          item.receiptNumber,
          item.transactionId,
          item.referenceNumber,
          item.month,
          item.year,
          item.notes
        ].filter(Boolean).map(v => String(v).toLowerCase());
        
        return searchableFields.some(field => field.includes(query));
      });
    }

    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
        result = result.filter(item => {
          let value = item[key];
          
          // Handle date filters
          if (key.includes('Date')) {
            const filterDate = new Date(filters[key]);
            const itemDate = new Date(value);
            if (key.includes('Start')) {
              return itemDate >= filterDate;
            }
            if (key.includes('End')) {
              return itemDate <= filterDate;
            }
          }
          
          // Handle amount range filters
          if (key.includes('amountMin')) {
            const amount = item.paidAmount || item.amount || 0;
            return amount >= filters[key];
          }
          if (key.includes('amountMax')) {
            const amount = item.paidAmount || item.amount || 0;
            return amount <= filters[key];
          }
          
          // Handle nested objects
          if (typeof value === 'object' && value !== null) {
            if (value._id) return value._id === filters[key];
            if (value.status) return value.status === filters[key];
            return false;
          }
          
          // Direct field comparison
          return String(value).toLowerCase() === String(filters[key]).toLowerCase();
        });
      }
    });

    return result;
  }, [data, searchQuery, filters]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested objects
      if (typeof aValue === 'object' && aValue !== null) {
        aValue = aValue.houseNumber || aValue.name || aValue.firstName || aValue.paidAmount || aValue.amount || '';
      }
      if (typeof bValue === 'object' && bValue !== null) {
        bValue = bValue.houseNumber || bValue.name || bValue.firstName || bValue.paidAmount || bValue.amount || '';
      }
      
      // Handle amount field specifically
      if (sortField === 'amount') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      // Handle dates
      if (aValue instanceof Date || (typeof aValue === 'string' && aValue.includes('T'))) {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // Compare
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortOrder]);

  // Paginate
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
  };

  return {
    searchQuery,
    setSearchQuery,
    filters,
    updateFilter,
    clearFilters,
    sortField,
    sortOrder,
    handleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedData,
    totalPages,
    totalItems: sortedData.length,
    sortedData
  };
};

