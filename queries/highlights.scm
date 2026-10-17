[
  (comment)
  (comment_block)
  (note)
  (unknown_subdirective)
] @comment @spell

[
  (quantity)
  (negative_quantity)
] @number

[
  (date)
  (effective_date)
  (interval)
] @string.special

(commodity) @type

(status) @attribute

(code) @string.special

(payee) @string

(multiplier
  "*" @operator)

(account) @variable.member

"include" @keyword.import

[
  "account"
  "alias"
  "aliases"
  "apply"
  "commodity"
  "decimal-mark"
  "end"
  "payee"
  "tag"
  "format"
  "default"
  "assert"
  "check"
  "eval"
  "uuid"
  "nomarket"
  "Y"
  "D"
  "P"
] @keyword
