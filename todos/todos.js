var Todo = Composer.Model.extend({
	defaults: {
		name: '',
		complete: false
	}
});

var TodosList = Composer.Collection.extend({
	model: Todo
});

var TodoDisplay = Composer.Controller.extend({
	inject: 'ul.todos',
	tag: 'li',
	className: 'clear',

	events: {
		'dblclick h3': 'edit_todo',
		'submit form.edit': 'do_edit_todo',
		'click input[type=checkbox]': 'toggle_complete',
		'click a.delete': 'delete_todo',
	},

	elements: {
		'h3': 'title',
		'form.edit': 'edit_form',
		'form.edit input[type=text]': 'inp_edit_name'
	},

	model: null,

	init: function()
	{
		// on model change, re-display
		this.model.bind('change', this.render.bind(this));

		// when model is destroyed (aka deleted) release this controller (pull its
		// "this.el" out of the DOM)
		this.model.bind('destroy', this.release.bind(this));

		// initial display
		this.render();
	},

	render: function()
	{
		this.html(
			'<input type="checkbox" '+ (this.model.get('complete', false) ? 'checked' : '') +'/>'+
			'<h3>'+this.model.get('name')+'</h3>'+
			'<form class="edit">'+
			'	<input type="text" value="'+this.model.get('name')+'" />'+
			'	<input type="submit" />'+
			'</form>'+
			'<div class="actions">'+
			'	<a class="delete" href="#delete-'+this.model.id()+'">X</a>'+
			'</div>'
		);

		this.edit_form.setStyle('display', 'none');

		// set the proper class
		if(this.model.get('complete', false))
		{
			this.el.addClass('complete');
		}
		else
		{
			this.el.removeClass('complete');
		}
	},

	edit_todo: function(e)
	{
		if(e) e.stop();
		this.edit_form.setStyle('display', 'block');
		this.title.setStyle('display', 'none');
		this.inp_edit_name.focus();
	},

	do_edit_todo: function(e)
	{
		if(e) e.stop();
		var name	=	this.inp_edit_name.value;

		if(name == this.model.get('name'))
		{
			// the new name is the same as the name, switch the form out for the
			// title
			this.edit_form.setStyle('display', 'none');
			this.title.setStyle('display', '');
		}
		else
		{
			// set the new name back into the model. no need to worry about
			// setting the form to display: none since the view is about to
			// re-render anyways once it detects this change.
			this.model.set({name: name});
		}
	},

	toggle_complete: function(e)
	{
		if(e) e.stop();

		var complete	=	this.model.get('complete', false);
		this.model.set({complete: !complete});
	},

	delete_todo: function(e)
	{
		if(e) e.stop();

		this.model.destroy();
	}
});

var TodoApp = Composer.Controller.extend({
	inject: '#container',
	className: 'app',

	events: {
		'submit form': 'add_todo',
		'click .clear-complete': 'clear_complete'
	},

	elements: {
		'form input[type=text]': 'inp_name',
		'.info .left': 'num_left',
		'.info .clear-complete': 'clear_btn'
	},

	// collection holding our Todos
	todos: null,

	init: function()
	{
		this.todos	=	new TodosList();
		this.todos.bind('add', this.do_add.bind(this));
		this.todos.bind('all', this.update_info.bind(this));
		this.render();
	},

	render: function()
	{
		this.html(
			'<form class="add">'+
			'	<input type="text" name="name" placeholder="What do you have to do?" />'+
			'	<input type="submit"/>'+
			'</form>'+
			'<ul class="todos"></ul>'+
			'<div class="info clear">'+
			'	<span class="left"></span>'+
			'	<button class="clear-complete">Clear Completed</button>'+
			'</div>'
		);
		this.update_info();
		console.log(this.clear_complete);
		return this;
	},

	add_todo: function(e)
	{
		if(e) e.stop();
		var todotxt	=	this.inp_name.value;
		if(todotxt.clean() == '') return false;

		// create a Todo model with the given data
		var todo	=	new Todo({name: todotxt});

		// add the Todo model to our Todo collection (which will in turn display the
		// todo item...see TodoApp.init() when it binds the collection's "add" event)
		this.todos.add(new Todo({name: todotxt}));

		this.inp_name.value	=	'';
		this.inp_name.focus();
	},

	do_add: function(todo)
	{
		var displayTodo	=	new TodoDisplay({model: todo});
	},

	clear_complete: function(e)
	{
		if(e) e.stop();

		// find all "complete" todos and .destroy() them >=]
		this.todos.select({complete: true}).each(function(m) { m.destroy(); });
	},

	update_info: function()
	{
		var num_left	=	this.todos.select({complete: false}).length;
		this.num_left.set('html', '<strong>'+num_left+'</strong> items in your list.');

		var num_complete	=	this.todos.select({complete: true}).length;
		if(num_complete > 0)
		{
			this.clear_btn.setStyle('visibility', '');
		}
		else
		{
			this.clear_btn.setStyle('visibility', 'hidden');
		}
	}
});
