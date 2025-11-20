# Email Display & Parsing System - Complete Breakdown

## Overview

This document covers the entire flow from clicking an email in the list to displaying its full content, including all parsing logic.

---

## Part 1: Email List Display

### API Call: Get Message List

**Location:** `src/api/index.jsx` (lines 25-34)

```javascript
export const getMessageList = async ({ labelIds, maxResults, q, pageToken }) => {
  // 1. Get raw message IDs
  const rawList = await getMessageRawList({ labelIds, maxResults, pageToken, q });
  
  // 2. Get message headers (preview data)
  const messageHeaders = await getMessageHeaders(rawList);
  
  // 3. Attach label metadata
  const flattenedMessages = await flattenMessagesWithLabel(
    messageHeaders.messages, 
    labelIds
  );
  
  return {
    ...messageHeaders,
    messages: flattenedMessages.messages,
    label: flattenedMessages.label
  };
}
```

### Step 1: Get Message IDs

```javascript
const getMessageRawList = async ({ labelIds, maxResults, pageToken, q = "" }) => {
  return await window.gapi.client.gmail.users.messages.list({
    userId: "me",
    q,                              // Search query
    maxResults: maxResults || 20,   // Limit results
    ...(labelIds && {labelIds}),    // Filter by labels (INBOX, SENT, etc.)
    ...(pageToken && { pageToken }) // Pagination token
  });
}
```

**Returns:**
```javascript
{
  messages: [
    { id: "abc123", threadId: "xyz789" },
    { id: "def456", threadId: "xyz789" },
    // ... just IDs, no content yet
  ],
  nextPageToken: "token_for_next_page",
  resultSizeEstimate: 150
}
```

### Step 2: Fetch Headers for List Preview

**Location:** `src/api/index.jsx` (lines 67-81)

```javascript
const getMessageHeaders = async (messageRawList) => {
  const messageResult = messageRawList.result;

  // Fetch header metadata for each message in parallel
  const headerPromises = (messageResult.messages || []).map(async (el) => {
    return await getMessageHeader(el.id);
  });

  const messages = await Promise.all(headerPromises);

  return {
    ...messageResult,
    messages
  };  
};

const getMessageHeader = async (id) => {
  const messages = await window.gapi.client.gmail.users.messages.get({
    userId: "me",
    id: id,
    format: "metadata",  // ← Only headers, not full body (fast!)
    metadataHeaders: [
      "To",
      "From",
      "Subject",
      "Date",
      "Reply-To",
      "Cc",
      "X-Received",
      "Message-ID",
      // ... more headers
    ]
  });
  return messages.result;
};
```

**Returns (per message):**
```javascript
{
  id: "abc123",
  threadId: "xyz789",
  labelIds: ["INBOX", "UNREAD", "IMPORTANT"],
  snippet: "Hey, just wanted to follow up on...",  // ← Preview text
  internalDate: "1700500800000",
  payload: {
    mimeType: "multipart/mixed",  // ← Indicates attachments
    headers: [
      { name: "From", value: "John Doe <john@example.com>" },
      { name: "Subject", value: "Meeting tomorrow" },
      { name: "Date", value: "Wed, 20 Nov 2024 10:30:00 -0800" },
      { name: "X-Received", value: "by ...; Wed, 20 Nov 2024 10:30:15 -0800" }
    ]
  }
}
```

---

## Part 2: Displaying Email Row

### Component: MessageRow

**Location:** `src/components/content/message-list/message-row/MessageRow.jsx`

```javascript
render() {
  const { data } = this.props; // ← Message object from API
  
  // 1. PARSE DATE
  const receivedHeader = data.payload.headers.find(
    el => el.name.toUpperCase() === "X-RECEIVED"
  );
  const date = receivedHeader 
    ? receivedHeader.value.split(";")[1].trim() 
    : "";
  
  // Format date intelligently
  let formattedDate = this.getFormattedDate(date, {
    date: data.internalDate, 
    parserFn: parseInt
  });
  // Returns: "10:30 AM" (today) or "Nov 20" (this year) or "2023/11/20" (old)
  
  // 2. CHECK IF UNREAD
  const unread = data.labelIds.indexOf("UNREAD") > -1 
    ? " font-weight-bold"  // ← Bold text for unread
    : "";
  
  // 3. PARSE SUBJECT
  const subjectHeader = data.payload.headers.find(
    el => el.name.toUpperCase() === "SUBJECT"
  );
  const subject = subjectHeader ? subjectHeader.value : "";
  
  // 4. PARSE FROM (Sender Name)
  const fromHeader = data.payload.headers.find(
    el => el.name.toUpperCase() === "FROM"
  );
  let fromName = fromHeader ? this.getFromName(fromHeader.value) : "undefined";
  
  // 5. CHECK FOR ATTACHMENTS
  const hasAttachment = data.payload.mimeType === "multipart/mixed";
  
  return (
    <div className={`table-row${unread}`} onClick={this.getMessage}>
      <NameSubjectFields fromName={fromName} subject={subject} />
      <AttachmentDateFields 
        formattedDate={formattedDate}
        hasAttachment={hasAttachment} 
      />
    </div>
  );
}
```

### Parsing Utilities

#### 1. Extract Name from Email Address

**Location:** `src/utils/index.jsx`

```javascript
export const getNameEmail = (value) => {
  // Input: "John Doe <john@example.com>" or "john@example.com"
  // Output: { name: "John Doe", email: "john@example.com" }
  
  if (!value) return null;
  
  const regex = /(?:"?([^"]*)"?\s)?(?:<?(.+@[^>]+)>?)/;
  let m, name, email;
  
  if ((m = regex.exec(value)) !== null) {
    email = m[2];
    name = m[1] || email.slice(0, email.indexOf("@")); // Use email prefix if no name
  }
  
  return { name, email };
}
```

**Examples:**
```javascript
getNameEmail("John Doe <john@example.com>")
// → { name: "John Doe", email: "john@example.com" }

getNameEmail("john@example.com")
// → { name: "john", email: "john@example.com" }

getNameEmail('"Support Team" <support@company.com>')
// → { name: "Support Team", email: "support@company.com" }
```

#### 2. Format Date Intelligently

**Location:** `src/components/content/message-list/message-row/MessageRow.jsx` (lines 30-53)

```javascript
getFormattedDate(date, fallbackDateObj) {
  let messageDate = moment(date);
  
  // Fallback to internalDate if parsing fails
  if (!messageDate.isValid()) {
    messageDate = moment(fallbackDateObj.parserFn(fallbackDateObj.date));
  }
  
  const nowDate = moment(new Date());
  const isMessageFromToday = messageDate.format("YYYYMMDD") === nowDate.format("YYYYMMDD");
  
  let formattedDate;
  if (isMessageFromToday) {
    formattedDate = messageDate.format("h:mm A");        // "10:30 AM"
  } else {
    if (messageDate.year() !== nowDate.year()) {
      formattedDate = messageDate.format("YYYY/MM/DD");  // "2023/11/20"
    } else {
      formattedDate = messageDate.format("MMM D");       // "Nov 20"
    }
  }
  
  return formattedDate;
}
```

---

## Part 3: User Clicks Email → Navigate to Detail View

### Click Handler in MessageRow

**Location:** `src/components/content/message-list/message-row/MessageRow.jsx` (lines 22-24)

```javascript
getMessage(evt) {
  // Navigate to message detail route
  this.props.history.push(`/${this.props.data.id}`);
}
```

**Result:** URL changes to `http://localhost:3000/abc123` (where `abc123` is the message ID)

---

## Part 4: Fetch Full Message Content

### Redux Action

**Location:** `src/components/content/message-list/actions/message-list.actions.jsx` (lines 77-91)

```javascript
export const getEmailMessage = messageId => dispatch => {
  dispatch(setMessageLoadInProgress());
  
  getMessage(messageId)
    .then(response => {
      dispatch({
        type: MESSAGE_LOAD_SUCCESS,
        payload: response  // ← Full message with body
      });
    })
    .catch(error => {
      dispatch({
        type: MESSAGE_LOAD_FAIL,
        payload: error
      });
    });
};
```

### API Call: Get Full Message

**Location:** `src/api/index.jsx` (lines 107-128)

```javascript
export const getMessage = async(messageId) => {  
  // Fetch full message with body content
  const response = await window.gapi.client.gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full"  // ← Get complete message including body
  });

  const { result } = response;

  // 1. Try to get HTML body first
  let body = getBody(result.payload, "text/html");        

  // 2. Fallback to plain text if no HTML
  if (body === "") {
    body = getBody(result.payload, "text/plain");
    // Convert line breaks to <br> tags
    body = body
      .replace(/(\r\n)+/g, '<br data-break="rn-1">')
      .replace(/[\n\r]+/g, '<br data-break="nr">');
  }

  // 3. If plain text but not HTML, wrap in divs for spacing
  if (body !== "" && !isHTML(body)) {
    body = body
      .replace(/(\r\n)+/g, '<div data-break="rn-1" style="margin-bottom:10px"></div>')
      .replace(/[\n\r]+/g, '<br data-break="nr">');
  }
    
  return {
    body,  // ← Parsed HTML content
    headers: response.headers,
    result: { 
      ...result, 
      messageHeaders: response.result.payload.headers, 
      payload: undefined 
    }
  };
};
```

**Gmail API Response Structure:**
```javascript
{
  id: "abc123",
  threadId: "xyz789",
  labelIds: ["INBOX"],
  snippet: "Preview text...",
  internalDate: "1700500800000",
  payload: {
    mimeType: "multipart/alternative",
    headers: [ /* ... */ ],
    body: { size: 0 },  // ← Empty for multipart
    parts: [             // ← Actual content is in parts
      {
        mimeType: "text/plain",
        body: {
          size: 1234,
          data: "SGVsbG8gd29ybGQh"  // ← Base64 encoded
        }
      },
      {
        mimeType: "text/html",
        body: {
          size: 2345,
          data: "PGh0bWw+PGJvZHk+SGVsbG8gd29ybGQhPC9ib2R5PjwvaHRtbD4="
        }
      }
    ]
  }
}
```

---

## Part 5: Parse Email Body

### Body Extraction Logic

**Location:** `src/api/utils.jsx`

```javascript
export const getBody = (message, mimeType) => {
  let encodedBody = "";
  
  // Check if message has parts (multipart email)
  if (typeof message.parts === "undefined") {
    // Simple message - body is directly in message.body.data
    encodedBody = message.body.data;
  } else {
    // Multipart message - recursively find the right MIME type
    encodedBody = getHTMLPart(message.parts, mimeType);
  }
  
  // Gmail uses URL-safe base64, convert back
  encodedBody = encodedBody
    .replace(/-/g, "+")     // - → +
    .replace(/_/g, "/")     // _ → /
    .replace(/\s/g, "");    // Remove whitespace
  
  // Decode base64 → UTF-8 string
  return decodeURIComponent(escape(window.atob(encodedBody)));
};

const getHTMLPart = (arr, mimeType) => {
  // Recursively search for the matching MIME type
  for (let x = 0; x < arr.length; x++) {
    if (typeof arr[x].parts === "undefined") {
      // Leaf node - check MIME type
      if (arr[x].mimeType === mimeType) {
        return arr[x].body.data;
      }
    } else {
      // Has nested parts - recurse
      return getHTMLPart(arr[x].parts, mimeType);
    }
  }
  return "";
};
```

### Example: Parsing Multipart Email

**Input (Gmail API response):**
```javascript
{
  payload: {
    mimeType: "multipart/alternative",
    parts: [
      {
        mimeType: "text/plain",
        body: { data: "SGVsbG8gd29ybGQh" }  // "Hello world!" in base64
      },
      {
        mimeType: "text/html",
        body: { data: "PGgxPkhlbGxvPC9oMT4=" }  // "<h1>Hello</h1>" in base64
      }
    ]
  }
}
```

**Step 1:** Call `getBody(payload, "text/html")`

**Step 2:** `getHTMLPart()` finds the `text/html` part → returns `"PGgxPkhlbGxvPC9oMT4="`

**Step 3:** Decode base64:
- URL-safe conversion: No changes needed
- `atob("PGgxPkhlbGxvPC9oMT4=")` → `"<h1>Hello</h1>"`

**Output:** `"<h1>Hello</h1>"`

### Check if Content is HTML

**Location:** `src/api/utils.jsx`

```javascript
export const isHTML = str => {
  // Parse the string as HTML
  const doc = new DOMParser().parseFromString(str, "text/html");
  
  // Check if any child nodes are HTML elements (nodeType === 1)
  return Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
}
```

**Examples:**
```javascript
isHTML("<h1>Hello</h1>")           // true
isHTML("Just plain text")          // false
isHTML("Hello\nWorld")             // false
isHTML("<div>Hello</div> World")   // true
```

---

## Part 6: Display Full Email Content

### Component: MessageContent

**Location:** `src/components/content/message-list/message-content/MessageContent.jsx`

```javascript
componentDidMount() {
  const messageId = this.props.match.params.id;  // From URL
  this.props.getEmailMessage(messageId);         // Fetch full message
}

componentDidUpdate(prevProps) {
  const { emailMessageResult } = this.props;
  
  if (!emailMessageResult.loading && !emailMessageResult.failed) {
    if (this.iframeRef.current) {
      // Render email body in sandboxed iframe
      const { body } = this.iframeRef.current.contentWindow.document;
      
      body.style.margin = "0px";
      body.style.fontFamily = "Arial, Helvetica, sans-serif";
      body.style.fontSize = "13px";
      
      // Insert parsed HTML
      body.innerHTML = this.props.emailMessageResult.body;
    }
  }
}

render() {
  return (
    <React.Fragment>
      <MessageToolbar 
        onClick={this.modifyMessage} 
        messageResult={this.props.emailMessageResult}
      />
      
      <div className="message-content">
        {/* Sandboxed iframe for email content */}
        <iframe
          ref={this.iframeRef}
          title="Message contents"
          id="message-iframe"
        />
      </div>
    </React.Fragment>
  );
}
```

**Why use an iframe?**
- **Security:** Sandboxes potentially malicious HTML/CSS/scripts from email
- **Isolation:** Email styles don't affect the app's UI
- **Safety:** Prevents XSS attacks from untrusted email content

---

## Part 7: Email Metadata in Toolbar

### Component: MessageToolbar

**Location:** `src/components/content/message-list/message-toolbar/MessageToolbar.jsx`

```javascript
render() {
  const message = this.props.messageResult.result;
  const { messageHeaders } = message;

  let replyTo, cc, subject;

  // Parse headers
  for (let i = 0; i < messageHeaders.length; i++) {
    const header = messageHeaders[i];
    switch (header.name) {
      case "Subject":
        subject = header;
        break;
      case "From":
        if (!replyTo) {
          replyTo = header;
        }
        break;
      case "Reply-To":
        replyTo = header;  // Override From with Reply-To if present
        break;
      case "Cc":
        cc = header;
        break;
      default:
        break;
    }
  }

  // Fallback to "From" if no "Reply-To"
  if (replyTo.value === '') {
    replyTo = messageHeaders.find(e => e.name === "From");
  }

  const nameEmail = getNameEmail(replyTo.value);
  
  // Get received date
  const receivedHeader = messageHeaders.find(el => el.name === "X-Received");
  const date = receivedHeader 
    ? receivedHeader.value.split(";")[1].trim() 
    : "";

  let parsedDate = moment(date);

  // Fallback to internalDate
  if (!parsedDate.isValid()) {
    parsedDate = moment(parseInt(this.props.messageResult.result.internalDate));
  }
  
  // Format for reply quote
  const replyHeader = `<p>On ${parsedDate.format("MMMM Do YYYY, h:mm:ss a")} < ${nameEmail.email} > wrote:</p>`;

  // Prepare reply template
  const composeProps = {
    subject: `Re: ${subject.value}`,
    to: nameEmail.email,
    content: `<p>&nbsp;</p>
        <p>&nbsp;</p>
        <p>&nbsp;</p>
        ${replyHeader}
        <blockquote>${this.props.messageResult.body}</blockquote>`,
    ...(cc && { cc: cc.value })
  };

  return (
    <div className="message-toolbar">
      <button onClick={() => this.props.onClick(["TRASH"])}>
        <FontAwesomeIcon icon={faTrash} />
      </button>
      
      <ComposeMessage {...composeProps}>
        <button>
          <FontAwesomeIcon icon={faReply} />
        </button>
      </ComposeMessage>
    </div>
  );
}
```

---

## Complete Data Flow Summary

```
User clicks email row
    ↓
MessageRow.getMessage() 
    ↓
history.push(`/${messageId}`)
    ↓
Route change triggers MessageContent component
    ↓
componentDidMount() calls getEmailMessage(messageId)
    ↓
Redux action dispatches MESSAGE_LOAD_IN_PROGRESS
    ↓
API: getMessage(messageId)
    ↓
Gmail API: users.messages.get({ id, format: "full" })
    ↓
Parse email body:
  1. Extract HTML or plain text from parts
  2. Decode base64
  3. Convert line breaks if plain text
    ↓
Redux action dispatches MESSAGE_LOAD_SUCCESS with { body, result }
    ↓
MessageContent.componentDidUpdate()
    ↓
Render body HTML into sandboxed iframe
    ↓
User sees full email content
```

---

## Integration Example for Tailwind Repo

### 1. Email List Component

```javascript
import { getLabelMessages } from './api';
import { getNameEmail } from './api/utils';
import moment from 'moment';

const EmailList = () => {
  const [emails, setEmails] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  
  useEffect(() => {
    getLabelMessages({ labelIds: ["INBOX"], maxResults: 50 })
      .then(result => setEmails(result.messages));
  }, []);
  
  const formatDate = (internalDate) => {
    const messageDate = moment(parseInt(internalDate));
    const nowDate = moment();
    const isToday = messageDate.format("YYYYMMDD") === nowDate.format("YYYYMMDD");
    
    if (isToday) return messageDate.format("h:mm A");
    if (messageDate.year() === nowDate.year()) return messageDate.format("MMM D");
    return messageDate.format("YYYY/MM/DD");
  };
  
  return (
    <div className="divide-y">
      {emails.map(email => {
        const fromHeader = email.payload.headers.find(h => h.name === "From");
        const subjectHeader = email.payload.headers.find(h => h.name === "Subject");
        const isUnread = email.labelIds.includes("UNREAD");
        
        const { name } = getNameEmail(fromHeader?.value || "");
        const subject = subjectHeader?.value || "(No subject)";
        const date = formatDate(email.internalDate);
        
        return (
          <div
            key={email.id}
            onClick={() => setSelectedId(email.id)}
            className={`p-4 hover:bg-gray-50 cursor-pointer ${
              isUnread ? 'font-bold' : ''
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900">{name}</div>
                <div className="text-sm text-gray-600 truncate">{subject}</div>
                <div className="text-xs text-gray-400 mt-1">{email.snippet}</div>
              </div>
              <div className="text-xs text-gray-500 ml-4">{date}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

### 2. Email Detail Component

```javascript
import { getMessage } from './api';
import { getNameEmail } from './api/utils';
import { useEffect, useState, useRef } from 'react';
import moment from 'moment';

const EmailDetail = ({ messageId }) => {
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef(null);
  
  useEffect(() => {
    if (!messageId) return;
    
    setLoading(true);
    getMessage(messageId)
      .then(response => {
        setMessage(response);
        setLoading(false);
      });
  }, [messageId]);
  
  useEffect(() => {
    if (message && iframeRef.current) {
      const doc = iframeRef.current.contentWindow.document;
      doc.body.style.margin = "0";
      doc.body.style.fontFamily = "Arial, Helvetica, sans-serif";
      doc.body.style.fontSize = "14px";
      doc.body.innerHTML = message.body;
    }
  }, [message]);
  
  if (loading) return <div>Loading...</div>;
  if (!message) return null;
  
  const { result } = message;
  const headers = result.messageHeaders;
  
  const fromHeader = headers.find(h => h.name === "From");
  const subjectHeader = headers.find(h => h.name === "Subject");
  const dateHeader = headers.find(h => h.name === "Date");
  
  const { name, email } = getNameEmail(fromHeader?.value || "");
  const subject = subjectHeader?.value || "(No subject)";
  const date = moment(dateHeader?.value).format("MMM D, YYYY h:mm A");
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6">
        <h1 className="text-2xl font-bold mb-2">{subject}</h1>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            <span className="font-semibold">{name}</span>
            <span className="text-gray-400 ml-2">&lt;{email}&gt;</span>
          </div>
          <div>{date}</div>
        </div>
      </div>
      
      {/* Body in iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          title="Email content"
          className="w-full h-full border-0"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
};
```

---

## Key Takeaways

1. **Two API calls:**
   - `messages.list()` → Get message IDs
   - `messages.get({ format: "metadata" })` → Get headers for list preview
   - `messages.get({ format: "full" })` → Get full content for detail view

2. **Email body is base64 encoded** - Must decode with URL-safe handling

3. **Multipart emails need recursive parsing** - HTML version is in nested `parts`

4. **Use iframe for rendering** - Security best practice for untrusted HTML

5. **Date formatting is context-aware** - Today shows time, older shows date

6. **Parse sender carefully** - Can be "Name <email>" or just "email"

All parsing logic is in `src/api/utils.jsx` and `src/utils/index.jsx` - completely portable!
