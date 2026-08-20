// =============================================================================
// validate.js — Request Validation Middleware using Joi
// =============================================================================

const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------
const schemas = {

  // Validate cluster ID in URL params (/clusters/123)
  clusterId: Joi.object({
    id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base'    : 'Cluster ID must be a number',
        'number.integer' : 'Cluster ID must be an integer',
        'number.positive': 'Cluster ID must be positive',
        'any.required'   : 'Cluster ID is required',
      }),
  }),

  // Validate job ID in URL params (/ingest/status/123)
  jobId: Joi.object({
    jobId: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base' : 'Job ID must be a number',
        'any.required': 'Job ID is required',
      }),
  }),

  // Validate query params for /clusters
  clusterQuery: Joi.object({
    source: Joi.string()
      .valid(
        'bbc', 'reuters', 'npr',
        'guardian', 'aljazeera', 'techcrunch',
        'hackernews', 'ap', 'unknown', 'all'
      )
      .default('all'),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(20),
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
  }),

  // Validate query params for /timeline
  timelineQuery: Joi.object({
    source: Joi.string()
      .valid(
        'bbc', 'reuters', 'npr',
        'guardian', 'aljazeera', 'techcrunch',
        'hackernews', 'ap', 'unknown', 'all'
      )
      .default('all'),
    days: Joi.number()
      .integer()
      .min(1)
      .max(30)
      .default(7),
  }),

};

// -----------------------------------------------------------------------------
// Validate Middleware Factory
// Returns a middleware function that validates req[target] against schema
// -----------------------------------------------------------------------------
function validate(schema, target = 'params') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly  : false,  // Return ALL errors, not just the first one
      stripUnknown: true,   // Remove unknown fields silently
      convert     : true,   // Convert strings to numbers where needed
    });

    if (error) {
      const message = error.details
        .map(d => d.message)
        .join(', ');

      return next(new ValidationError(message));
    }

    req[target] = value;
    next();
  };
}

module.exports = { validate, schemas };