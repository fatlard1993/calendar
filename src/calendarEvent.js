import Log from 'log';
import dom from 'dom';

class CalendarEvent {
	constructor(data, calendar){
		if(typeof data !== 'object') return false;

		this.calendar = calendar;
		this.options = data;

		this.log = new Log({ tag: 'calendar' });

		this.at = new Date(data.at);

		if(!this.at) return false;

		this.label = data.label;
		this.notes = data.notes;
		this.color = data.color;
		this.duration = data.duration;
		this.year = this.at.getFullYear();
		this.month = this.at.getMonth() + 1;
		this.day = this.at.getDate();
		this.hour = this.at.getHours();
		this.minute = this.at.getMinutes();
		this.fullDate = `${this.month}/${this.day}/${this.year}`;

		this.log()('Create event', this);

		return this;
	}

	formatDuration(duration, append = '', prepend = ''){
		if(!duration) return '';

		duration = Math.floor(duration / 1000 / 60);

		const h = Math.floor(duration / 60);
		const m = duration % 60;

		return append + (h ? (h +'h ') : '') + (m ? (m +'mins') : '') + prepend;
	}

	render(type, container){
		const formattedTime = this.calendar.formatTime(this.at);

		this.elem = dom.createElem('div', {
			data: { at: this.at },
			className: 'event',
			appendChildren: [
				dom.createElem('div', { className: 'time', textContent: `${formattedTime}${this.duration ? this.formatDuration(this.duration, ', ') : ''}` }),
				dom.createElem('div', { className: 'label', textContent: this.label }),
			],
			appendTo: container,
			onPointerPress: (evt) => {
				this.calendar.emit('selectEvent', { target: evt.target, index: this.options.index });
			}
		});

		if(type === 'day'){
			const gapPos = (this.at.getHours() * 2) + (this.at.getMinutes() / 30);
			const gapHeight = `${(this.duration ? Math.ceil(this.duration / 1000 / 60 / 30) : 1) * 3}em`;
			const gapTop = `${gapPos * 3}em`;

			if(this.color) this.elem.style.backgroundColor = this.color;

			this.elem.style.height = gapHeight;
			this.elem.style.top = gapTop;
			this.elem.style.left = '0';
			this.elem.style.zIndex = Math.floor(gapPos);

			if(this.duration) this.elem.children[0].textContent = formattedTime + (this.formatDuration(this.duration, ', '));
		}

		return this.elem;
	}
}

if(typeof module === 'object') module.exports = CalendarEvent;