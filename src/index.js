import Log from 'log';
import dom from 'dom';
import lang from 'lang';
import lang_en from '_lang_en-US';
import CalendarEvent from 'calendarEvent';

class Calendar {
	constructor(options = {}){
		this.elem = dom.createElem('div', { className: 'calendar' });
		this.options = Object.assign(this.defaultOptions, options);
		this.hooks = {};

		this.log = new Log({ tag: 'calendar', verbosity: options.verbosity });

		const now = new Date();

		this.state = {
			view: this.options.defaultView,
			events: [],
		};

		this.setDate(now.getFullYear(), now.getMonth(), now.getDate());

		this.create();

		this.setDate(this.state.year, this.state.month, this.state.day);

		this.log()('Created new instance');

		return this;
	}

	formatTime(date){
		let h = date.getHours();
		const m = date.getMinutes();
		const s = date.getSeconds();

		let am_pm = '';

		if(!this.options.display24h){
			if(!this.options.display24h){
				am_pm = h < 12 ? 'AM' : 'PM';
				h = this.to12hour(h);
			}
		}

		return h + (m < 10 ? ':0' : ':') + m + (s && this.options.displaySeconds ? ((s < 10 ? ':0' : ':') + s) : '') + am_pm;
	}

	eventsAt(date){
		date = new Date(date);

		var events = [];

		this.state.events.forEach((event) => {
			if(!event.recurring){
				if(event.year === date.getFullYear() && event.month === date.getMonth() + 1 && event.day === date.getDate()) events.push(event);

				return;
			}

			if(!event.daily){
				event.whitelist.forEach((dateItem) => {
					dateItem = new Date(dateItem);

					if(dateItem.getFullYear() === date.getFullYear() && dateItem.getMonth() === date.getMonth() && dateItem.getDate() === date.getDate()) events.push(event);
				});

				return;
			}

			for(var x = 0, count = event.blacklist.length; x < count; ++x){
				var dateItem = new Date(event.blacklist[x]);

				// if(parseInt(dateItem[2]) === date.getFullYear() && parseInt(dateItem[1]) === date.getMonth() + 1 && parseInt(dateItem[0]) === date.getDate() + 1) return;
				if(dateItem.getFullYear() === date.getFullYear() && dateItem.getMonth() === date.getMonth() && dateItem.getDate() === date.getDate()) return;
			}

			if(event.weekdays[lang.get('days')[date.getDay()].toLowerCase()] && (date.getFullYear() > event.year || (date.getFullYear() === event.year && (date.getMonth() + 1) > event.month) || (date.getFullYear() === event.year && (date.getMonth() + 1) === event.month && date.getDate() >= event.day))) events.push(event);
		});

		return events;
	}

	create(){
		dom.empty(this.elem);

		this.controlBar = dom.createElem('div', { className: 'control-bar', appendTo: this.elem });
		this.wrapper = dom.createElem('div', { className: 'calendar-wrapper', appendTo: this.elem });

		this.title = dom.createElem('div', { className: 'title', appendTo: this.controlBar });

		['day', 'week', 'month'].forEach((view, index) => {
			dom.createElem('button', {
				className: `left set-${view}${view === 'month' ? ' pressed' : ''}`,
				textContent: lang.get('views')[index],
				appendTo: this.controlBar,
				onPointerPress: () => { this.setView(view); }
			});
		});

		['next', 'today', 'previous'].forEach((action) => {
			dom.createElem('button', {
				className: 'right',
				textContent: { next: '>', today: lang.get('today'), previous: '<' }[action],
				appendTo: this.controlBar,
				onPointerPress: () => {	this[action](); }
			});
		});
	}

	adjustDateToView() {
		if(this.state.view !== 'week' || this.state.weekday === this.state.day || this.state.day > 8) return;

		--this.state.month;

		if(this.state.month < 0){
			--this.state.year;

			this.state.month = 11;
		}

		this.state.day = this.getDaysInMonth(this.state.year, this.state.month).numberOfDays;
	}

	today(){
		const now = new Date();

		this.setDate(now.getFullYear(), now.getMonth(), now.getDate());

		this.adjustDateToView();

		return this.render();
	}

	previous(){
		if(this.state.view === 'day'){
			--this.state.day;

			if(this.state.day <= 0){
				--this.state.month;

				if(this.state.month < 0){
					this.state.month = 11;

					--this.state.year;
				}

				const monthStat = this.getDaysInMonth(this.state.year, this.state.month);

				this.state.day = monthStat.numberOfDays;
			}
		}

		else if(this.state.view === 'month'){
			--this.state.month;

			if(this.state.month < 0){
				this.state.month = 11;

				--this.state.year;
			}
		}

		else if(this.state.view === 'week'){
			this.state.day -= 7;

			if(this.state.day <= 0){
				--this.state.month;

				if(this.state.month < 0){
					this.state.month = 11;

					--this.state.year;
				}

				const monthStat = this.getDaysInMonth(this.state.year, this.state.month);

				this.state.day = monthStat.numberOfDays + this.state.day;
			}
		}

		this.setDate(this.state.year, this.state.month, this.state.day);

		return this.render();
	}

	next(){
		if(this.state.view === 'day'){
			++this.state.day;

			const monthStat = this.getDaysInMonth(this.state.year, this.state.month);

			if(this.state.day > monthStat.numberOfDays){
				this.state.day = 1;

				++this.state.month;

				if(this.state.month > 11){
					this.state.month = 0;

					++this.state.year;
				}
			}
		}

		else if(this.state.view === 'month'){
			++this.state.month;

			if(this.state.month > 11){
				this.state.month = 0;

				++this.state.year;
			}
		}

		else if(this.state.view === 'week'){
			this.state.day += 7;

			const monthStat = this.getDaysInMonth(this.state.year, this.state.month);

			if(this.state.day > monthStat.numberOfDays){
				++this.state.month;

				if(this.state.month > 11){
					this.state.month = 0;

					++this.state.year;
				}

				const monthStat = this.getDaysInMonth(this.state.year, this.state.month);

				this.state.day -= monthStat.numberOfDays;
			}
		}

		this.setDate(this.state.year, this.state.month, this.state.day);

		return this.render();
	}

	goToDay(position){
		this.log()('go-to-day', position);

		const date = new Date(position);

		this.setDate(date.getFullYear(), date.getMonth(), date.getDate());

		this.setView('day');
	}

	addEvent(eventItem){
		if(eventItem){
			this.state.events.push(new CalendarEvent(eventItem, this));

			this.emit('newEvent', eventItem);
		}

		return this;
	}

	on(event, callback){
		this.hooks[event] = this.hooks[event] || [];
		this.hooks[event].push(callback);

		return this;
	}

	emit(event, extra){
		const events = this.hooks[event];

		if(!events){
			this.log(3)(`No event listeners for '${event}'`);

			return this;
		}

		this.log()(`Firing event '${event}'`);

		events.forEach((evt) => { evt.call(this, extra); });

		return this;
	}

	toNth(num){
		if(num > 3 && num < 21) return lang.get('nth')[0];

		return lang.get('nth')[num.toString().slice(-1)] || lang.get('nth')[0];
	}

	setView(view){
		if(this.state.view !== view){
			this.state.view = view;

			var pressed = this.controlBar.querySelector('.pressed');
			var toPress = this.controlBar.querySelector(`.set-${view}`);

			if(pressed) pressed.classList.remove('pressed');
			if(toPress) toPress.classList.add('pressed');

			this.adjustDateToView();
			this.render();
		}

		return this;
	}

	render(){
		this.log()('Rendering instance');

		const benchStart = performance.now();

		dom.empty(this.wrapper);

		if(this.state.view === 'day') this.renderDay();

		else if(this.state.view === 'week') this.renderWeek();

		else this.renderMonth();

		this.wrapper.scrollTop = 0;

		if(document.activeElement) document.activeElement.blur();

		this.log()(`Rendering benchmark : ${performance.now() - benchStart}ms`);

		return this;
	}

	renderDay(){
		this.elem.classList.remove('month', 'week');
		this.elem.classList.add('day');

		this.title.textContent = `${lang.get('months')[this.state.month]} ${this.state.day}${this.toNth(this.state.day)}, ${this.state.year}`;

		const eventContainer = dom.createElem('div', { className: 'event-container', appendTo: this.wrapper });
		const events = this.eventsAt(`${this.state.year}/${this.state.month + 1}/${this.state.day}`);
		const minGap = 30;
		const gapsPerHour = Math.ceil(60 / minGap);

		for(let x = 0; x < 24; ++x){
			for(let y = 0; y < gapsPerHour; ++y){
				const minutesBlock = dom.createElem('div', {
					className: 'time-block',
					appendTo: this.wrapper,
					onPointerPress: (evt) => { this.emit('selectTime', evt); },
				});
				const timeSpan = dom.createElem('span', { className: 'time', appendTo: minutesBlock });

				const mins = y * minGap;
				let h = x;
				let am_pm = '';

				// minutesBlock.style.height = (this.options.dayViewGapHeight - 1) +'px';

				if(!this.options.display24h){
					am_pm = h < 12 ? 'AM' : 'PM';
					h = h < 12 ? h : h % 12;
					h = h === 0 ? 12 : h;
				}

				timeSpan.textContent = `${h}:${mins < 10 ? '0' : ''}${mins} ${am_pm}`;
			}
		}

		const groups = {};
		let smallestGap = -1;

		events.forEach((event) => {
			var elem = event.render(this.state.view, eventContainer);
			event.elem = elem;
			event.ratio = 100;
			elem.style.left = '0';

			let totalGaps = event.gapCount;

			if(Math.floor(event.gapCell) !== event.gapCell) ++totalGaps;

			for(let x = 0; x < totalGaps; ++x){
				const gap = Math.floor(event.gapCell + x);

				groups[gap] = groups[gap] || [];

				groups[gap].push(event);
			}

			if(smallestGap === -1 || smallestGap > event.gapCell) smallestGap = event.gapCell;
		});

		Object.keys(groups).forEach((gap) => {
			const total = groups[gap].length;
			const ratio = 100 / total;

			groups[gap].forEach((event, index) => {
				const minLeft = index * ratio;
				const minRight = ratio * (total - index - 1);

				if(ratio < event.ratio){
					event.ratio = ratio;
					event.elem.style.left = minLeft +'%';
					event.elem.style.right = minRight +'%';
				}
			});
		});
	}

	renderWeek(){
		this.elem.classList.remove('month', 'day');
		this.elem.classList.add('week');

		const dayMs = 1000 * 60 * 60 * 24;
		const now = new Date();
		const dayObj = new Date(this.state.year, this.state.month, this.state.day);
		const firstDay = new Date(dayObj.getTime() - (dayObj.getDay() * dayMs));
		const lastDay = new Date(firstDay.getTime() + (6 * dayMs));

		this.log()('Rendering week');

		let cDay = new Date(firstDay.getTime());

		for(let x = 0; x < 7; ++x){
			const y = cDay.getFullYear();
			const m = cDay.getMonth();
			const d = cDay.getDate();
			const w = cDay.getDay();
			const t = cDay.getTime();

			const fullDate = `${m + 1}/${d}/${y}`;
			const events = this.eventsAt(fullDate);
			const isToday = y === now.getFullYear() && m === now.getMonth() && d === now.getDate();

			const weekdayCell = dom.createElem('div', {
				className: `day-cell${isToday ? ' today' : ''}`,
				data: { at: cDay.getTime(), fullDate },
				onPointerPress: (evt) => { this.emit('selectDay', { target: evt.target, fullDate }); },
				appendTo: this.wrapper
			});

			dom.createElem('div', {
				textContent: `${lang.get('days')[w]}, ${lang.get('months')[m]} ${d}${this.toNth(d)}`,
				className: 'day-title',
				appendTo: weekdayCell,
				onPointerPress: (evt) => { this.emit('selectDay', { target: evt.target, isTitle: true, fullDate }); }
			});

			for(let y = 0; y < events.length; ++y) events[y].render(this.state.view, weekdayCell);

			cDay = new Date(t + dayMs);
		}

		const firstDayAppend = this.toNth(firstDay.getDate());
		const lastDayAppend = this.toNth(lastDay.getDate());

		if(firstDay.getMonth() === lastDay.getMonth()){
			this.title.textContent = lang.get('months')[firstDay.getMonth()] +' '+ firstDay.getDate() + firstDayAppend +' - '+ lastDay.getDate() + lastDayAppend +', '+ this.state.year;
		}

		else if(firstDay.getYear() === lastDay.getYear()){
			this.title.textContent = lang.get('months')[firstDay.getMonth()] +' '+ firstDay.getDate() + firstDayAppend +' - '+ lang.get('months')[lastDay.getMonth()] +' '+ lastDay.getDate() + lastDayAppend +', '+ this.state.year;
		}

		else{
			this.title.textContent = lang.get('months')[firstDay.getMonth()] +' '+ firstDay.getDate() + firstDayAppend +', '+ firstDay.getFullYear() +' - '+ lang.get('months')[lastDay.getMonth()] +' '+ lastDay.getDate() + lastDayAppend +', '+ lastDay.getFullYear();
		}
	}

	renderMonth(){
		this.elem.classList.remove('week', 'day');
		this.elem.classList.add('month');

		const month = this.getDaysInMonth(this.state.year, this.state.month);
		const now = new Date();
		const isCurrentMonth = now.getMonth() === this.state.month && now.getFullYear() === this.state.year;
		const currentDay = now.getDate();
		const table = dom.createElem('table', { className: 'calendar-table', appendTo: this.wrapper });
		const titleRow = dom.createElem('tr', { className: 'title', appendTo: table });
		let dayX = -month.firstDay;

		for(let day = 0; day < 7; ++day) dom.createElem('td', { textContent: lang.get('days')[day], appendTo: titleRow });

		for(let row = 0; row < 6; ++row){
			const tr = dom.createElem('tr', { appendTo: table });

			for(let col = 0; col < 7; ++col){
				const date = new Date(this.state.year, this.state.month, ++dayX);
				const fullDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
				const eventContainer = dom.createElem('div', { className: 'event-container' });
				const td = dom.createElem('td', {
					className: `day-cell row${row} col${col}${isCurrentMonth && currentDay === dayX ? ' today' : ''}`,
					data: { at: date.getTime(), fullDate },
					appendTo: tr,
					onPointerPress: (evt) => { this.emit('selectDay', { target: evt.target, fullDate }); },
					appendChildren: [
						dom.createElem('span', {
							textContent: date.getDate(),
							className: 'day-title',
							onPointerPress: (evt) => { this.emit('selectDay', { target: evt.target, isTitle: true, fullDate }); }
						}),
						eventContainer
					]
				});

				if(dayX <= 0 || dayX > month.numberOfDays) td.classList.add('not-in-month');

				this.eventsAt(fullDate).forEach((calendarEvent) => { if(calendarEvent.render) calendarEvent.render(this.state.view, eventContainer); });
			}
		}

		this.title.textContent = lang.get('months')[this.state.month] +' '+ this.state.year;
	}

	setDate(year, month, day, reRender){
		this.state.year = parseInt(year);
		this.state.month = parseInt(month);
		this.state.day = parseInt(day);
		this.state.weekday = new Date(year, month, day).getDay();

		if(reRender) this.render();
	}

	getDaysInMonth(year, month){
		const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

		return {
			numberOfDays: [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month],
			firstDay: new Date(year, month).getDay()
		};
	}

	to12hour(hour){
		hour = hour < 12 ? hour : hour % 12;

		if(hour === 0) hour = 12;

		return hour;
	}

	get defaultOptions(){
		return {
			views: ['day', 'week', 'month'],
			defaultView: 'month',
			display24h: false,
			displaySeconds: true
		};
	}
}

if(typeof module === 'object') module.exports = Calendar;