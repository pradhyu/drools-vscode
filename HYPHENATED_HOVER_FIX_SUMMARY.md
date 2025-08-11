# Hyphenated Keyword Hover Fix Summary

## 🐛 **Issue Description**
Hover functionality was not working for Drools rule attributes that contain hyphens, such as:
- `no-loop`
- `lock-on-active` 
- `activation-group`
- `agenda-group`
- `ruleflow-group`

**Example problematic rule:**
```drools
rule "add 500"
    no-loop true
    lock-on-active true
    salience 1
when
    $s : Order(amount > 500 && amount <= 1000)
then
    $s.setScore(500);
    update($s);
end
```

## 🔍 **Root Cause Analysis**
The issue was in the `getWordAtPosition` method in `src/server/providers/enhancedHoverProvider.ts`. The regex pattern used for word extraction was:

```typescript
const wordRegex = /[$a-zA-Z_][a-zA-Z0-9_]*/g;
```

This pattern **did not include hyphens (`-`)**, so it couldn't properly extract hyphenated keywords like `no-loop` or `lock-on-active`.

## ✅ **Solution Implemented**

### 1. **Fixed Word Extraction Regex**
Updated the regex pattern to include hyphens:

```typescript
// OLD (broken)
const wordRegex = /[$a-zA-Z_][a-zA-Z0-9_]*/g;

// NEW (fixed)
const wordRegex = /[$a-zA-Z_][$a-zA-Z0-9_-]*/g;
```

**Key change:** Added `-` to the character class `[$a-zA-Z0-9_-]*` to allow hyphens in word matching.

### 2. **Added Missing Documentation**
Added comprehensive documentation for missing hyphenated attributes:

#### **lock-on-active**
```typescript
['lock-on-active', {
    keyword: 'lock-on-active',
    description: 'Prevents a rule from firing again while any rule in the same agenda group is executing.',
    syntax: 'lock-on-active [true|false]',
    example: `rule "Process Order"
    agenda-group "order-processing"
    lock-on-active true
when
    $order : Order(status == "NEW")
then
    $order.setStatus("PROCESSING");
    update($order);
end`,
    category: 'attribute',
    relatedKeywords: ['agenda-group', 'no-loop', 'salience']
}]
```

#### **activation-group**
```typescript
['activation-group', {
    keyword: 'activation-group',
    description: 'Groups rules so that only one rule in the group can fire. Once one rule fires, all other rules in the group are cancelled.',
    syntax: 'activation-group "group-name"',
    example: `rule "High Value Customer"
    activation-group "customer-classification"
    salience 10
when
    $customer : Customer(totalPurchases > 10000)
then
    $customer.setCategory("PREMIUM");
end`,
    category: 'attribute',
    relatedKeywords: ['agenda-group', 'salience']
}]
```

### 3. **Comprehensive Testing**
Created extensive unit tests to verify the fix:

- ✅ **8 test cases** covering all hyphenated keywords
- ✅ **Word extraction tests** to verify regex pattern works correctly
- ✅ **Complex rule tests** with multiple hyphenated attributes
- ✅ **Negative tests** for non-existent hyphenated keywords

## 🎯 **Fixed Keywords**
The following hyphenated Drools attributes now have working hover documentation:

| Keyword | Description | Status |
|---------|-------------|---------|
| `no-loop` | Prevents rule from firing again due to its own actions | ✅ Fixed |
| `lock-on-active` | Prevents rule from firing while agenda group is executing | ✅ Fixed |
| `activation-group` | Only one rule in group can fire | ✅ Fixed |
| `agenda-group` | Groups rules for controlled execution | ✅ Fixed |
| `ruleflow-group` | Associates rule with ruleflow group | ✅ Fixed |

## 🧪 **Testing Results**
```
✅ should provide hover for no-loop attribute
✅ should provide hover for lock-on-active attribute  
✅ should provide hover for activation-group attribute
✅ should provide hover for agenda-group attribute
✅ should provide hover for ruleflow-group attribute
✅ should handle complex rule with multiple hyphenated attributes
✅ should not provide hover for non-existent hyphenated keywords
✅ should extract hyphenated words correctly

Test Suites: 1 passed, 1 total
Tests: 8 passed, 8 total
```

## 📝 **Usage Examples**

### **Before Fix (Broken)**
```drools
rule "add 500"
    no-loop true        // ❌ No hover documentation
    lock-on-active true // ❌ No hover documentation  
    salience 1
when
    $s : Order(amount > 500 && amount <= 1000)
then
    $s.setScore(500);
    update($s);
end
```

### **After Fix (Working)**
```drools
rule "add 500"
    no-loop true        // ✅ Hover shows: "Prevents a rule from firing again due to its own actions"
    lock-on-active true // ✅ Hover shows: "Prevents a rule from firing again while any rule in the same agenda group is executing"
    salience 1          // ✅ Hover shows: "Sets rule priority. Higher values execute first"
when
    $s : Order(amount > 500 && amount <= 1000)
then
    $s.setScore(500);
    update($s);
end
```

## 🚀 **Impact**
- **Improved Developer Experience**: Hover documentation now works for all Drools rule attributes
- **Better Learning**: Developers can quickly understand hyphenated attributes without consulting external docs
- **Consistency**: All Drools keywords now have consistent hover behavior
- **Reduced Errors**: Proper documentation helps prevent misuse of rule attributes

## 📁 **Files Modified**
1. **`src/server/providers/enhancedHoverProvider.ts`** - Fixed word extraction regex
2. **`src/server/documentation/droolsDocumentation.ts`** - Added missing documentation
3. **`test/enhanced-tooltips/enhancedHoverProvider.test.ts`** - Added comprehensive tests

The hyphenated keyword hover functionality is now fully working! 🎉