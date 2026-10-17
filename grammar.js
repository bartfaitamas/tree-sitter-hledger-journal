/**
 * @file hledger journal grammar
 * @author Tamas Bartfai <tamas@bartfai.dev>
 * @license MIT
 */

export default grammar({
  name: 'hledger_journal',

  extras: $ => [],

  externals: $ => [
    $._eof,
    $._comment_block_body,
  ],

  inline: $ => [
    $.spacer,
    $.whitespace,
  ],

  rules: {
    source_file: $ => repeat(choice($.journal_item, $._newline)),

    // A line ends in a newline (optionally preceded by trailing whitespace,
    // optionally CRLF) or at the end of the file.
    _newline: $ => token(seq(/[ \t]*/, /\r?\n/)),
    _eol: $ => choice($._newline, $._eof),

    journal_item: $ => choice(
      seq($.comment, $._eol),
      $.comment_block,
      $._directive,
      $.xact,
    ),

    xact: $ => choice(
      $.plain_xact,
      $.periodic_xact,
      $.automated_xact,
    ),

    automated_xact: $ => createXact(
      $,
      seq(
        '=',
        optional(seq($.whitespace, $.query)),
        optional($.note),
        $._eol,
      ),
      alias($._auto_posting, $.posting),
    ),

    query: $ => /[^\r\n]+/,

    comment: $ => token(seq(choice(';', '#', '*'), /[^\r\n]*/)),

    // "comment" ... "end comment"; runs to the end of the file when the
    // closing line is missing.
    comment_block: $ => seq('comment', $._eol, $._comment_block_body),

    // An indented line under a directive that hledger ignores.
    unknown_subdirective: $ => seq(
      $.whitespace,
      token(prec(-1, /[^ \t\r\n;][^\r\n]*/)),
      $._eol,
    ),

    _directive: $ => choice(
      $.accountdirective,
      $.aliasdirective,
      $.commoditydirective,
      $.endaliasesdirective,
      $.applyaccountdirective,
      $.endapplyaccountdirective,
      $.decimalmarkdirective,
      $.defaultyeardirective,
      $.marketpricedirective,
      $.defaultcommoditydirective,
      $.includedirective,
      $.payeedirective,
      $.tagdirective,
    ),


    payeedirective: $ => seq(
      'payee', $.whitespace, $.payee, lineEnd($),
      repeat(choice(
          seq($.whitespace, $.comment, $._eol),
          $.payee_subdirective,
          $.unknown_subdirective,
      )),
    ),

    payee_subdirective: $ => choice(
        $.alias_subdirective,
        argumentDirective($, 'uuid'),
    ),

    tagdirective: $ => seq(
      'tag', $.whitespace, /[^\s;]+/, lineEnd($),
      repeat(choice(
          seq($.whitespace, $.comment, $._eol),
          $.assert_subdirective,
          $.check_subdirective,
          $.unknown_subdirective,
      )),
    ),

    accountdirective: $ => seq(
      'account', $.whitespace, $.account, lineEnd($),
      repeat(choice(
          seq($.whitespace, $.comment, $._eol),
          $.account_subdirective,
          $.unknown_subdirective,
      )),
    ),

    account_subdirective: $ => choice(
        $.alias_subdirective,
        $.default_subdirective,
        $.note_subdirective,
        $.assert_subdirective,
        $.check_subdirective,
        argumentDirective($, 'eval'),
        argumentDirective($, 'payee'),
    ),

    aliasdirective: $ => seq(
      'alias',
      $.whitespace,
      /[^\r\n]+/,
      lineEnd($)
    ),

    endaliasesdirective: $ => seq(
      'end',
      $.whitespace,
      'aliases',
      lineEnd($)
    ),

    commoditydirective: $ => seq(
      'commodity', $.whitespace, choice($.amount, $.commodity), lineEnd($),
      repeat(choice(
          seq($.whitespace, $.comment, $._eol),
          $.commodity_subdirective,
      )),
    ),

    commodity_subdirective: $ => choice(
        $.alias_subdirective,
        $.default_subdirective,
        $.format_subdirective,
        $.note_subdirective,
        singleKeywordDirective($, 'nomarket'),
    ),

    alias_subdirective: $ => argumentDirective($, 'alias'),
    default_subdirective: $ => singleKeywordDirective($, 'default'),
    format_subdirective: $ => seq(
        $.whitespace,
        'format',
        $.whitespace,
        $.amount,
        $._eol,
    ),
    note_subdirective: $ => argumentDirective($, 'note'),
    assert_subdirective: $ => argumentDirective($, 'assert'),
    check_subdirective: $ => argumentDirective($, 'check'),

    applyaccountdirective: $ => seq(
      'apply',
      $.whitespace,
      'account',
      $.whitespace,
      $.account,
      spacedLineEnd($)
    ),

    endapplyaccountdirective: $ => seq(
      'end',
      $.whitespace,
      'apply',
      $.whitespace,
      'account',
      spacedLineEnd($)
    ),

    decimalmarkdirective: $ => seq(
      'decimal-mark',
      $.whitespace,
      $.decimalmark,
      spacedLineEnd($)
    ),
    decimalmark: $ => choice('.', ','),

    defaultyeardirective: $ => seq(
      choice("Y", "year", "apply year"),
      optional($.whitespace),
      $.year,
      spacedLineEnd($)
    ),

    includedirective: $ => seq('include', $.whitespace,  $.includepath, lineEnd($)),
    includepath: $ => /[^;\r\n]*[^ \t;\r\n]/,

    marketpricedirective: $ => seq(
      'P',
      $.whitespace,
      $.date,
      $.whitespace,
      $.commodity,
      $.whitespace,
      $.amount,
      lineEnd($),
    ),

    defaultcommoditydirective: $ => seq('D', $.whitespace, $.amount, lineEnd($)),

    commodity: $ => choice(/\p{L}+/, /\p{Sc}/, /"[^"\r\n]*"/),
    amount: $ => {
      const quantity = seq(optional('+'), $.quantity);
      const negative_quantity = seq('-', $.negative_quantity);

      return choice(
        prec.right(1, seq(
          choice(quantity, negative_quantity),
          optional($.whitespace),
          optional($.commodity)
        )),
        prec.right(1, seq(
          $.commodity,
          optional($.whitespace),
          choice(quantity, negative_quantity),
        )),
        prec.right(1, seq(
          '-',
          optional($.whitespace),
          $.commodity,
          optional($.whitespace),
          $.negative_quantity
        ))
      )
    },
    // Digit groups may be separated by . , space, no-break space (U+00A0) or
    // narrow no-break space (U+202F). A leading decimal mark (.5) is allowed.
    // An exponent (1e3) is allowed only without digit group separators, as
    // in hledger.
    _quantity: $ => token(choice(
      /[.,]\d+([eE][+-]?\d+)?/,
      /\d([\d., \u00A0\u202F]*[\d.,])?/,
      /\d+([.,]\d*)?[eE][+-]?\d+/,
    )),
    quantity: $ => $._quantity,
    negative_quantity: $ => $._quantity,

    // = single-commodity, == total, =* / ==* inclusive of subaccounts.
    // The asserted amount may carry a cost.
    balance_assertion: $ => prec.right(seq(
      choice('=', '==', '=*', '==*'),
      optional(seq(
        optional($.whitespace),
        $.amount,
        optional(alias($._spaced_price, $.price)),
      )),
    )),

    // A cost whose leading spaces belong to the @ token, so that spaces
    // after an asserted amount can still lead to a posting comment.
    _spaced_price: $ => seq(
      token(seq(/[ \t]*/, choice('@', '@@'))),
      optional($.whitespace),
      $.amount,
    ),

    lot_price: $ => choice(
      seq( '{', optional($.whitespace), $.amount, optional($.whitespace), '}'),
      seq('{{', optional($.whitespace), $.amount, optional($.whitespace), '}}'),
    ),

    price: $ => seq(
      choice('@', '@@'),
      optional($.whitespace),
      $.amount,
    ),

    // A single space continues the name; two spaces or a tab end it. A
    // leading * or ! is always a posting status mark in hledger.
    account: $ => /[^ \t\r\n;*!](?:[^ \t\r\n]| [^ \t\r\n])*/,

    _txdate: $ => seq($.date, optional($.effective_date)),

    date: $ => seq($._single_date),
    effective_date: $ => seq('=', $._single_date),

    date_spec: $ => choice(
      $._4d,
      $._year_month,
      $._single_date,
      $._month,
      $._relative_date_spec
    ),
    // HACK: months and abbreviated months are locale specific, so just
    // match any "word"
    _month: $ => /[^0-9\s]+/,

    year: $ => choice($._2d, $._4d),

    _relative_date_spec: $ => seq(
      choice('last', 'this', 'next'),
      $.whitespace,
      choice('day', 'week', 'month', 'quarter', 'year', $._month),
    ),

    _dsep: $ => /[-\.\/]/,
    _2d: $ => /\d{1,2}/,
    _4d: $ => /\d{4}/,
    _single_date: $ => choice(
      seq($._4d, $._dsep, $._2d, $._dsep, $._2d),
      seq($._2d, $._dsep, $._2d, $._dsep, $._2d),
      seq($._2d, $._dsep, $._2d),
    ),

    payee: $ => seq(/[^(*!;\s][^\r\n;]*/),

    secondarydate: $ => seq('=', /(\d{4}-)?\d{2}-\d{2}/),

    status: $ => choice('*', '!'),
    code: $ => seq('(',  /[^)\r\n]*/, ')'),

    plain_xact: $ => createXact(
      $,
      seq(
        $._txdate,
        optional(seq($.whitespace, $.secondarydate)),
        optional(choice(
          // a status mark may be followed directly by the payee: "*Shop"
          seq(
            $.whitespace, $.status,
            optional(seq($.whitespace, $.code)),
            optional(seq(optional($.whitespace), $.payee)),
          ),
          seq($.whitespace, $.code, optional(seq($.whitespace, $.payee))),
          seq($.whitespace, $.payee),
        )),
        optional(seq(optional($.whitespace), $.note)),
        $._eol,
      ),
    ),

    periodic_xact: $ => createXact(
      $,
      seq(
        '~',
        optional($.whitespace),
        $.interval,
        // the description is separated from the period expression by two
        // or more spaces
        optional(seq(
          $._description_separator,
          optional(seq($.status, optional($.whitespace))),
          choice(seq($.payee, optional($.note)), $.note),
        )),
        $._eol,
      )
    ),

    _description_separator: $ => token(/[ \t][ \t]+/),

    interval: $ => choice(
      $._interval_period,
      $._interval_date_spec,
      seq($._interval_period, $.whitespace, $._interval_date_spec),
      // "monthly 2023-08": only numeric dates, so "monthly rent" stays an error
      seq($._interval_period, $.whitespace, alias($._numeric_date_spec, $.date_spec)),
      $._single_date,
      // "~ 15": day of month
      $._2d,
    ),

    _numeric_date_spec: $ => choice(
      $._4d,
      $._year_month,
      $._single_date,
    ),
    _year_month: $ => seq($._4d, $._dsep, $._2d),

    _interval_period: $ => {
      const ci = s => new RegExp(caseInsensitive(s))
      const ciNum = s => new RegExp(caseInsensitive('every') + ' \\d+ ' + caseInsensitive(s))
      return choice(
        ci('every day'),
        ci('every week'),
        ci('every month'),
        ci('every quarter'),
        ci('every year'),
        ciNum('days'),
        ciNum('weeks'),
        ciNum('months'),
        ciNum('quarters'),
        ciNum('years'),
        ci('daily'),
        ci('weekly'),
        ci('biweekly'),
        ci('monthly'),
        ci('bimonthly'),
        ci('quarterly'),
        ci('yearly'),
        ...everyDayForms(),
      )
    },

    _interval_date_spec: $ => {
      const ci = s => new RegExp(caseInsensitive(s))

      const from = seq(
        choice(ci('since'), ci('from')),
        $.whitespace,
        $.date_spec,
      );
      const until = seq(
        choice(ci('until'), ci('to')),
        $.whitespace,
        $.date_spec,
      );

      return choice(
        from,
        until,
        seq(from, $.whitespace, until),
        seq(ci('in'), $.whitespace, $.date_spec),

        // just "next week", "last month", etc
        alias($._relative_date_spec, $.date_spec),
      )
    },

    posting: $ => postingRule($, $.amount),

    // Postings of automated transactions may use a multiplier instead of an
    // amount: "*-1" multiplies the matched posting's amount.
    _auto_posting: $ => postingRule($, choice($.amount, $.multiplier)),
    multiplier: $ => seq('*', $.amount),

    note: $ => seq(';', repeat(/[^\r\n]/)),

    whitespace: $ => repeat1(choice(' ', '\t')),

    spacer: $ => choice('  ', '\t', ' \t'),


  }
});

function createXact($, first_line, posting = $.posting) {
  return seq(
    first_line,
    repeat(
      choice(posting,
             seq($.whitespace, $.note, $._eol)))
  )
}

function postingRule($, amount) {
  return seq(
    $.whitespace,
    optional(seq($.status, optional($.whitespace))),
    $.account,
    optional(seq(
      $.spacer,
      optional(seq(optional($.whitespace), amount)),
      optional(seq(optional($.whitespace), $.lot_price)),
      optional(seq(optional($.whitespace), $.price)),
      optional(seq(optional($.whitespace), $.balance_assertion)),
      optional(seq(optional($.whitespace), $.note)),
    )),
    $._eol,
  )
}


function caseInsensitive(input) {
    return input
        .split('')
        .map(letter => `[${letter}${letter.toUpperCase()}]`)
        .join('')
}

function argumentDirective($, argument) {
    return seq(
            $.whitespace,
            argument,
            $.whitespace,
            /[^\r\n]+/,
            $._eol,
    )
}

function singleKeywordDirective($, keyword) {
    return seq(
            $.whitespace,
            keyword,
            $._eol,
    )
}

function lineEnd($) {
    return choice($._eol, seq(optional($.whitespace), $.comment, $._eol))
}

function spacedLineEnd($) {
    return choice($._eol, seq($.whitespace, $.comment, $._eol))
}

// Case-insensitive regex source: only letters are changed, so alternation
// and quantifiers keep working.
function ciSource(s) {
    return s.replace(/\\.|[a-z]/g, c => c.length > 1 ? c : `[${c}${c.toUpperCase()}]`)
}

// "every Nth day [of month]", "every Nth <weekday>", "every <month> Nth",
// "every Nth <month>", "every weekday", "every weekendday"
function everyDayForms() {
    const weekday = '(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)'
    const month = '(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)'
    const nth = '\\d{1,2}(st|nd|rd|th)'
    const every = 'every +'
    return [
        `${every}${nth} +day( +of +month)?`,
        `${every}${nth} +${weekday}`,
        `${every}${month} +${nth}`,
        `${every}${nth} +${month}`,
        `${every}(weekday|weekendday)`,
    ].map(s => new RegExp(ciSource(s)))
}
