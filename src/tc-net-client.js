const ical = require('ical'),
  request = require('request'),
  cheerio = require('cheerio'),
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const INSA_ICS = "http://tc-net2.insa-lyon.fr/aff/AffichageEdtTexteMatiere.jsp";
const parseRegexp = /Sem\. [0-9]{1,2}, [a-z]{0,3}\. ([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}) +([0-9]{2}h[0-9]{2})-([0-9]{2}h[0-9]{2}) +([0-9])TC(?:-G([0-9]+))? +([A-Za-z0-9-_]*) +\[((?:[A-Z]{3}(?:, )?)*)\] +([0-9])*-*([0-9-A-Za-zéèà ]*[0-9-A-Za-zéèà])(?: {([0-9-A-Za-zéèà \/\\]*)})?/mg;

function TcNetClient() {
  this.lessons = {};
  this.courses = [];

  this.fetchCourses = function (callback) {
    request.get(INSA_ICS, function (err, res, body) {
      const $ = cheerio.load(body);
      const courses = [];
      $('select[name="choixMatiere"] option').each(function (i, option) {
        let name = $(option).html();
        if (name === null || name.endsWith("-17")) return;
        courses.push(new Course(name));
      });
      callback(courses);
    })
  };

  this.fetch = function (course, group, callback) {
    if (course === null) throw new Error('Please provide a course to fetch');
    if (!(course instanceof Course)) {
      course = new Course(course);
    }

    if (!group) group = 'all';
    if (group === 'all') {
      group = [0, 1, 2, 3, 4, 5]
    } else {
      group = [group]
    }

    request.post(INSA_ICS, {
      form: {
        'choixMatiere': course.id,
        'SelectionMatiere': 'ok'
      }
    }, function (err, res, data) {
      const $ = cheerio.load(data);
      let lesson;
      let content = $('pre').html().split('\n');
      content.splice(0, 1);
      lesson = content.map(function (line) {
        parseRegexp.lastIndex = 0;
        const data = parseRegexp.exec(line);
        if(data===null)return;
        const theme = data[6];
        const name = course.name;
        const type = data[8];
        const room = data[9];
        const start = data[1] + ' ' + data[2];
        const end = data[1] + ' ' + data[3];
        const year = data[4];
        const group = data[5];
        const ens = data[7];
        return new Lesson(
          course,
          name,
          theme,
          type,
          room,
          start,
          end,
          year,
          group,
          ens
        )
      });
      lesson = lesson.filter(function (e) {
        return typeof e !== 'undefined';
      });
      callback(lesson);
    })

  }

  this.fetchAll = function (courses, group, callback) {
    const that = this;
    courses = courses.split(',');
    const lessons = [];
    let tokensBeforeReturn = courses.length;

    const localCallback = function (loaded_lessons) {
      lessons.push.apply(lessons, loaded_lessons);
      tokensBeforeReturn--;
      if(tokensBeforeReturn <= 0) callback(lessons);
    };

    if(tokensBeforeReturn === 0) {
      localCallback([]);
    } else {
      courses.map(function (c) {
        that.fetch(c, group, localCallback);
      });
    }
  }

}

function Lesson(course, name, theme, type, room, start, end, year, group, ens) {
  this.course = course;
  this.name = name;
  this.type = type;
  this.room = room;
  this.start = start;
  this.end = end;
  this.year = year;
  this.group = group;
  this.ens = ens;
  this.theme = theme;

  this.getTypeName = function(){
    switch(this.type) {
      case "1":
        return "Amphi";
      case "2":
        return "TD";
      case "3":
        return "TP";
      default:
        return "Cours"
    }
  };

  this.getDescription = function(){
    let description = "";

    if(this.theme) {
      description += this.theme + " - ";
    }
    if(this.ens){
      description += this.ens + " - ";
    }
    if(this.type) {
      description += this.getTypeName();
    }
    return description;
  };

  this.toJSON = function () {
    return {
      name: this.name,
      course: this.course,
      group: this.group,
      location: this.room,
      description: this.getDescription(),
      theme: this.theme,
      ens: this.ens.split(", "),
      type: this.type,
      start: this.start,
      end: this.end
    }
  }
}

function Course(name) {
  const reg = /^(([1-9])(TC[A]*)|[A-Z]+)-([A-Za-z0-9-]+)$/gm;
  this.id = name;
  const data = reg.exec(name);
  if(data && data[2]) {
    this.year = parseInt(data[2]);
    this.section = data[3];
    this.name = data[4];
  } else {
    if (data && data[0]){
      this.name = data[4];
      this.section = data[1];
    } else {
      this.name = name;
    }
  }
}

TcNetClient.Lesson = Lesson;
TcNetClient.Course = Course;

module.exports = TcNetClient;
