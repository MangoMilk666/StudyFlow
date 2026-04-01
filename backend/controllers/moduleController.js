const Module = require('../models/Module');

// Get all modules for user
exports.getAllModules = async (req, res) => {
  try {
    const { userId } = req.query;
    const modules = await Module.find({ userId });
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new module
exports.createModule = async (req, res) => {
  try {
    const { userId, name, colorCode, description } = req.body;

    const module = new Module({
      userId,
      name,
      colorCode: colorCode || '#3f51b5',
      description,
    });

    await module.save();
    res.status(201).json(module);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update module
exports.updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const module = await Module.findByIdAndUpdate(id, updates, { new: true });
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    res.json(module);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete module
exports.deleteModule = async (req, res) => {
  try {
    const { id } = req.params;
    const module = await Module.findByIdAndDelete(id);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
