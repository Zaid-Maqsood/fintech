const accountsService = require('./accounts.service');

const getAccounts = async (req, res, next) => {
  try {
    const accounts = await accountsService.getUserAccounts(req.user.id);
    return res.status(200).json(accounts);
  } catch (err) {
    next(err);
  }
};

const getAccount = async (req, res, next) => {
  try {
    const account = await accountsService.getAccountById(req.params.id, req.user.id);
    return res.status(200).json(account);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAccounts, getAccount };
