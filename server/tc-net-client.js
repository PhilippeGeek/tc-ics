const ical = require('ical'),
  request = require('request'),
  cheerio = require('cheerio'),
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const INSA_ICS = "http://tc-net2.insa-lyon.fr/aff/AffichageEdtTexteMatiere.jsp";
const parseRegexp = /Sem\. [0-9]{1,2}, [a-z]{0,3}\. ([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4}) +([0-9]{2}h[0-9]{2})-([0-9]{2}h[0-9]{2}) +([0-9])TC(?:-G([0-9]+))? +([A-Za-z0-9-_]*) +\[((?:[A-Z]{3}(?:, )?)*)\] +([0-9])-([0-9-A-Za-zéèà ]*[0-9-A-Za-zéèà])(?: {([0-9-A-Za-zéèà ]*)})?/mg;

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
        'choixMatiere': course.name,
        'SelectionMatiere': 'ok'
      }
    }, function (err, res, data) {
      const $ = cheerio.load(data);
      let lesson = [];
      let content = $('pre').html().split('\n');
      content.splice(0, 1);
      lesson = content.map(function (line) {
        parseRegexp.lastIndex = 0;
        const data = parseRegexp.exec(line);
        if(data===null)return;
        const name = course.name + " - " + data[6];
        const type = data[8];
        const room = data[9];
        const start = data[1] + ' ' + data[2];
        const end = data[1] + ' ' + data[3];
        const year = data[4];
        const group = data[5];
        const ens = data[7];
        return new Lesson(
          name,
          type,
          room,
          start,
          end,
          year,
          group,
          ens
        )
      });
      callback(lesson);
    })

  }
}

function Lesson(name, type, room, start, end, year, group, ens) {
  this.name = name;
  this.type = type;
  this.room = room;
  this.start = start;
  this.end = end;
  this.year = year;
  this.group = group;
  this.ens = ens;

  this.toJSON = function () {
    return {
      name: this.name + " (" + this.type + ")",
      location: this.room + ", 6 avenue des Arts, 69100 Villeurbanne",
      start: this.start,
      end: this.end
    }
  }
}

function Course(name) {
  this.name = name;
}

TcNetClient.Lesson = Lesson;
TcNetClient.Course = Course;

module.exports = TcNetClient;
