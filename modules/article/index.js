module.exports = {
  extend: '@apostrophecms/piece-type',
  fields: {
    add: {
      string: {
        label: 'String',
        type: 'string',
        required: true,
        help: 'One cannot separate orchestras from cheerful magicians. The fructed knowledge reveals itself as an unkempt tub to those who look. This could be, or perhaps few can name a crimpy thailand that isn\'t a shadeless literature. A timer can hardly be considered an unfilled chalk without also being a priest. The almanacs could be said to resemble chaster beards.'
      },
      blockString: {
        label: 'Text area',
        type: 'string',
        textarea: true
      },
      slugger: {
        type: 'slug',
        label: 'Fake Slug',
        textarea: true
      },
      timeField: {
        label: 'TIME',
        type: 'time',
        def: null
      },
      _topics: {
        label: 'Article topics',
        type: 'relationship',
        withType: 'topic'
      },
      main: {
        label: 'Content',
        type: 'area',
        options: {
          widgets: require('../../lib/area').fullConfig
        }
      },
      // _articles: {
      //   label: 'Joined article',
      //   type: 'relationship',
      //   withType: 'article',
      //   builders: {
      //     project: {
      //       title: 1,
      //       type: 1,
      //       categoriesIds: 1
      //     }
      //   }
      // },
      arrayField: {
        label: 'Label',
        type: 'array',
        titleField: 'Array Label',
        min: 2,
        fields: {
          add: {
            string: {
              type: 'string',
              label: 'String'
            },
            moreString: {
              type: 'string',
              label: 'More String'
            }
          }
        }
      },
      attachmentField: {
        label: 'Attachment',
        type: 'attachment',
        group: 'office'
      },
      photoField: {
        label: 'Photo attachment',
        type: 'attachment',
        group: 'image'
      },
      booleanField: {
        label: 'Boolean',
        type: 'boolean',
        readOnly: true
      },
      booleanCustom: {
        label: 'Labeled Boolean',
        type: 'boolean',
        choices: [
          {
            label: 'Go',
            value: true
          },
          {
            label: 'Stop',
            value: false
          }
        ]
      },
      checkFields: {
        label: 'Label',
        required: true,
        type: 'checkboxes',
        choices: [
          {
            label: 'Small',
            value: 'small'
          },
          {
            label: 'Medium',
            value: 'med'
          },
          {
            label: 'Big',
            value: 'big'
          }
        ]
      },
      colorField: {
        type: 'color',
        label: 'Color',
        required: true
      },
      dateField: {
        // name: 'dateField',
        label: 'Date',
        type: 'date',
        min: '2020-01-01'
      },
      emailField: {
        type: 'email',
        max: 5,
        required: true
      },
      floatField: {

        label: 'Float',
        type: 'float',
        min: 1.0,
        max: 4.0
      },
      integerField: {
        label: 'Integer',
        type: 'integer',
        min: 3,
        max: 9
      },
      oembedField: {
        label: 'Embedder',
        required: true,
        type: 'oembed'
      },
      passwordField: {
        // name: 'passwordField',
        label: 'Password',
        type: 'password'
      },
      rangeField: {
        type: 'range',
        label: 'Range',
        min: 18,
        max: 32,
        step: 2 // optional
      },
      selector: {
        label: 'Select a color scheme for this page',
        type: 'select',
        choices: [
          {
            label: 'Dark 🌚',
            value: 'dark'
          },
          {
            label: 'Light 💡',
            value: 'light'
          },
          {
            label: 'Dusk 🌆',
            value: 'dusk'
          },
          {
            label: 'Swamp 🐢',
            value: 'swamp'
          }
        ]
      },
      urlField: {
        label: 'URL',
        required: true,
        type: 'url'
      }
    },
    group: {
      strings: {
        label: 'Strings',
        fields: [
          'title',
          'string',
          'blockString',
          'timeField',
          'dateField',
          'emailField',
          'passwordField',
          'slugger'
        ]
      },
      basics: {
        label: 'Basics',
        fields: [
          'title',
          'blurb'
        ]
      },
      main: {
        label: 'Content',
        fields: [
          'main',
          '_topics'
        ]
      }
    }
  },
  columns: {
    add: {
      _topics: {
        label: 'Topics',
        component: 'DemoCellRelation'
      }
    }
  },
  components(self) {
    return {
      async recent(req, data) {
        return {
          articles: await self.find(req).limit(data.limit).sort({ createdAt: -1 }).toArray()
        };
      }
    };
  },
  init(self) {
    // blurb used to be a string; now we've decided it should be
    // a rich text widget. Make the conversion with a migration
    self.apos.migration.add('blurb', async () => {
      await self.apos.migration.eachDoc({
        type: 'article'
      }, 5, async (doc) => {
        if ((typeof doc.blurb) === 'string') {
          doc.blurb = self.apos.area.fromPlaintext(doc.blurb);
          return self.apos.doc.db.updateOne({
            _id: doc._id
          }, {
            $set: {
              blurb: doc.blurb
            }
          });
        }
      });
    });
  }
};