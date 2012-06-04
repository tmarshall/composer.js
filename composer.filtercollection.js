/**
 * NOTE: FilterCollection is considered alpha/experimental and although this
 * most likely won't happen, it may be subject to substantial API changes. Use/
 * depend on at your own risk!
 *
 * It's also completely undocumented...good luck!
 * -----------------------------------------------------------------------------
 *
 * Composer.js is an MVC framework for creating and organizing javascript 
 * applications. For documentation, please visit:
 *
 *     http://lyonbros.github.com/composer.js/
 * 
 * -----------------------------------------------------------------------------
 *
 * Copyright (c) 2011, Lyon Bros Enterprises, LLC. (http://www.lyonbros.com)
 * 
 * Licensed under The MIT License. 
 * Redistributions of files must retain the above copyright notice.
 */
(function() {
	/**
	 * Collection that exists solely to be a "materialized view" of another
	 * "master" collection. Whenever items are added/removed from the master
	 * collection, the changes are filtered and applied to this collection as well.
	 * This is useful for keeping many collections in sync with one master list
	 * without having to manually update them all.
	 */
	var FilterCollection	=	new Class({
		Extends: Composer.Collection,

		master: null,
		filter: null,
		transform: null,
		limit: false,

		_do_match_action: null,

		initialize: function(master, options)
		{
			options || (options = {});

			Object.each(Object.clone(options), function(v, k) {
				if(typeof(v) == 'function') v = v.bind(this);
				this[k]	=	v;
			}, this);

			// assign the unique app id
			this._cid	=	Composer.cid();

			this.master	=	master;

			if(!this.master) return false;
			if(!this.filter) return false;

			this.attach(options);
			if(!options.skip_initial_sync) this.refresh();
		},

		attach: function()
		{
			if(!this._do_match_action) this._do_match_action = this.match_action.bind(this);
			this.master.bind('all', this._do_match_action);
			this.bind('reset', function(options) {
				options || (options = {});
				if(options.has_reload) return false;
				this.refresh(options);
			}.bind(this), 'filtercollection:reset');
		},

		detach: function()
		{
			this.master.unbind('all', this._do_match_action);
			this.unbind('reset', 'filtercollection:reset');
		},

		match_action: function(event, model)
		{
			switch(event)
			{
			case 'add':
				this.add_event(model, {from_event: true}); break;
			case 'reset':
				this.refresh(); break;
			case 'clear':
				this.clear(); break;
			case 'remove':
				this.remove_event(model, {from_event: true}); break;
			case 'change':
				this.change_event(); break;
			case 'sort':
				this.refresh(); break;
			}
		},

		refresh: function(options)
		{
			options || (options = {});

			this._models	=	this.master._models.filter(this.filter);
			this.sort({silent: true});
			if(this.limit) this._models.splice(this.limit);
			this.fire_event('reset', options, {has_reload: true});
		},

		change_event: function(options)
		{
			options || (options = {});

			// track the current number of items and reloda the data
			var num_items	=	this._models.length;
			this.refresh({silent: true});

			// do nothing if no change
			if(this._models.length == num_items)
			{
				this.fire_event('change', options);
			}
			else
			{
				this.fire_event('reset', options);
			}
		},

		set_filter: function(fn, options)
		{
			if(!fn) return false;
			options || (options = {refresh: true});
			this.filter	=	fn.bind(this);
			if(!options.refresh) this.refresh();
		},

		add: function(data, options)
		{
			if (data instanceof Array)
			{
				return Object.each(data, function(model) { this.add(model, options) }, this);
			}
			
			options || (options = {});
			if(typeof(options.transform) == 'undefined') options.transform = true;

			// if we are passing raw data, create a new model from data
			var model		=	data.__is_model ? data : new this.master.model(data, options);

			if(this.transform && options.transform)
			{
				model	=	this.transform.call(this, model, 'add');
			}

			// model doesn't match filter. NICE TRY
			if(!this.filter(model)) return false;

			if(typeof(options.at) == 'number')
			{
				// find the correct insertion point in the master it options.at is set.
				var current		=	this.at(options.at);
				var master_idx	=	this.master.index_of(current);
				if(master_idx > -1)
				{
					options.at	=	master_idx;
				}
			}
			
			// add this model into the master (if it's not already in it)
			return this.master.upsert(model, options);
		},

		remove: function(model, options)
		{
			if (model instanceof Array)
			{
				return Object.each(model, function(m) { this.remove(m) }, this);
			}
			
			options || (options = {});
			if(typeof(options.transform) == 'undefined') options.transform = true;

			if(!this._models.contains(model)) return false;

			if(this.transform && options.transform)
			{
				model	=	this.transform.call(this, model, 'remove');
			}

			// remove the model
			this._models.erase(model);

			this.fire_event('remove', options, model);

			// remove the model from the collection
			this._remove_reference(model);
		},

		add_event: function(model, options)
		{
			if(!this.filter(model)) return false;
			this.refresh({silent: true});
			this.fire_event('add', options, model, this, options);
		},

		remove_event: function(model, options)
		{
			if(!this._models.contains(model)) return false;
			this.refresh({silent: true});
			this.fire_event('remove', options, model);
		}
	});
	FilterCollection.extend	=	function(obj, base)
	{
		obj || (obj = {});
		base || (base = FilterCollection);
		obj	=	Composer.Base.extend.call(this, obj, base);
		return this._do_extend(obj, base);
	};

	Composer.FilterCollection	=	FilterCollection;
	Composer._export(['FilterCollection']);
})();
