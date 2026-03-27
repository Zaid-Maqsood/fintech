const analyticsService = require('./analytics.service');

const getOverview = async (req, res, next) => {
  try {
    const data = await analyticsService.getOverview(req.user.id);
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

const getSpendingByCategory = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 3;
    const data = await analyticsService.getSpendingByCategory(req.user.id, months);
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

const getMonthlyFlow = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const data = await analyticsService.getMonthlyFlow(req.user.id, months);
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

const getBudgetVsActual = async (req, res, next) => {
  try {
    const data = await analyticsService.getBudgetVsActual(req.user.id);
    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview, getSpendingByCategory, getMonthlyFlow, getBudgetVsActual };
