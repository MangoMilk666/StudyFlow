const Module = require('../models/Module');

function ensureOwner(doc, userId) {
  return doc && doc.userId && doc.userId.toString() === String(userId)
}

// Get all modules for user
exports.getAllModules = async (req, res) => {
  try {
    const userId = req.user?.userId
    const modules = await Module.find({ userId });
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new module
exports.createModule = async (req, res) => {
  try {
    const userId = req.user?.userId
    const { name, colorCode, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name required' })
    }

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

    const existing = await Module.findById(id)
    if (!existing) return res.status(404).json({ error: 'Module not found' })
    if (!ensureOwner(existing, req.user?.userId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const module = await Module.findByIdAndUpdate(id, updates, { new: true });
    res.json(module);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete module
exports.deleteModule = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Module.findById(id)
    if (!existing) return res.status(404).json({ error: 'Module not found' })
    if (!ensureOwner(existing, req.user?.userId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await Module.findByIdAndDelete(id);
    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
