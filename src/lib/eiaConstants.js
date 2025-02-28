// src/lib/eiaConstants.js

/**
 * Common EIA Series IDs for energy commodities
 */
const EIA_SERIES = {
    // Petroleum prices
    GASOLINE_REGULAR: 'PET.EMM_EPMR_PTE_NUS_DPG.W', // Weekly U.S. Regular Gasoline Prices (Dollars per Gallon)
    GASOLINE_PREMIUM: 'PET.EMM_EPMP_PTE_NUS_DPG.W', // Weekly U.S. Premium Gasoline Prices (Dollars per Gallon)
    DIESEL: 'PET.EMD_EPD2D_PTE_NUS_DPG.W', // Weekly U.S. No 2 Diesel Retail Prices (Dollars per Gallon)
    HEATING_OIL: 'PET.W_EPLLPA_PRS_NUS_DPG.W', // Weekly U.S. Residential Heating Oil Price (Dollars per Gallon)
    PROPANE: 'PET.W_EPLLPA_PRS_NUS_DPG.W', // Weekly U.S. Residential Propane Price (Dollars per Gallon)
    
    // Crude oil prices
    WTI_CRUDE: 'PET.RWTC.W', // Weekly Cushing, OK WTI Spot Price FOB (Dollars per Barrel)
    BRENT_CRUDE: 'PET.RBRTE.W', // Weekly Europe Brent Spot Price FOB (Dollars per Barrel)
    
    // Natural gas prices
    NATURAL_GAS: 'NG.RNGWHHD.W', // Weekly Henry Hub Natural Gas Spot Price (Dollars per Million Btu)
    
    // Electricity prices
    ELECTRICITY_RESIDENTIAL: 'ELEC.PRICE.US-RES.M', // Monthly U.S. Residential Electricity Price (Cents per Kilowatthour)
  };
  
  /**
   * Mapping EIA Series IDs to their API endpoints and facet values
   */
  const EIA_API_MAPPING = {
    // Petroleum prices - regular gasoline
    'PET.EMM_EPMR_PTE_NUS_DPG.W': {
      endpoint: 'petroleum/pri/gnd/data',
      facetSeries: 'EMM_EPMR_PTE_NUS_DPG'
    },
    // WTI Crude oil
    'PET.RWTC.W': {
      endpoint: 'petroleum/pri/spt/data',
      facetSeries: 'RWTC'
    },
    // Natural gas
    'NG.RNGWHHD.W': {
      endpoint: 'natural-gas/pri/sum/data',
      facetSeries: 'RNGWHHD'
    }
  };
  
  /**
   * Display names for EIA commodities
   */
  const EIA_COMMODITY_NAMES = {
    GASOLINE_REGULAR: 'Regular Gasoline (Gallon)',
    GASOLINE_PREMIUM: 'Premium Gasoline (Gallon)',
    DIESEL: 'Diesel (Gallon)',
    HEATING_OIL: 'Heating Oil (Gallon)',
    PROPANE: 'Propane (Gallon)',
    WTI_CRUDE: 'WTI Crude Oil (Barrel)',
    BRENT_CRUDE: 'Brent Crude Oil (Barrel)',
    NATURAL_GAS: 'Natural Gas (Million Btu)',
    ELECTRICITY_RESIDENTIAL: 'Residential Electricity (kWh)',
  };
  
  /**
   * Display colors for EIA commodities
   */
  const EIA_COMMODITY_COLORS = {
    GASOLINE_REGULAR: '#e63946', // red
    GASOLINE_PREMIUM: '#d62828', // darker red
    DIESEL: '#023e8a', // dark blue
    HEATING_OIL: '#fb8500', // orange
    PROPANE: '#ffb703', // yellow
    WTI_CRUDE: '#2a9d8f', // teal
    BRENT_CRUDE: '#168aad', // blue
    NATURAL_GAS: '#4361ee', // bright blue
    ELECTRICITY_RESIDENTIAL: '#7209b7', // purple
  };
  
  module.exports = {
    EIA_SERIES,
    EIA_API_MAPPING,
    EIA_COMMODITY_NAMES,
    EIA_COMMODITY_COLORS
  };