# Moodle Web Service API Reference

Base URL: `https://hselearning.sriher.com`
All REST calls go through `/webservice/rest/server.php` and require `wstoken` + `moodlewsrestformat=json` as params, in addition to the function-specific params listed below.

---

## Authentication

### `POST /login/token.php`
Exchanges username/password for a web service token.

**Input (form-urlencoded body)**
| Param | Type | Notes |
|---|---|---|
| `username` | string | Moodle username |
| `password` | string | Moodle password |
| `service` | string | `moodle_mobile_app` |

**Response**
```json
{
  "token": "string",
  "privatetoken": "string"
}
```
Use `token` as `wstoken` for all subsequent calls. `privatetoken` is only used for mobile app silent re-auth flows — not needed here.

**Error response shape**
```json
{
  "error": "string",
  "errorcode": "string"
}
```

---

## `POST /webservice/upload.php`
Uploads a file to the user's draft area, returning an `itemid` that can be used to attach the file to submissions, forum posts, etc.

**Input (form-data)**
| Param | Type | Required | Notes |
|---|---|---|---|
| `token` | string | yes | Passed in URL (`?token=...`). Note: this is `token`, not `wstoken`. |
| `file` | file | yes | The file to upload. Must be in the `form-data` body with the key type set to File. |

**Response**
Returns an array of file records. The key field is `itemid`.
```json
[
  {
    "component": "user",
    "contextid": 330655,
    "userid": "36064",
    "filearea": "draft",
    "filename": "My SQL Practice.docx",
    "filepath": "/",
    "itemid": 925603497,
    "license": "allrightsreserved",
    "author": "SOMESHWAR S SARAVANAN D",
    "source": "O:8:\"stdClass\":1:{s:6:\"source\";s:20:\"My SQL Practice.docx\";}",
    "filesize": 14978
  }
]
```

---

## `core_webservice_get_site_info`
Returns account/site info plus the full list of `wsfunction`s the token is permitted to call.

**Input**
| Param | Type | Required |
|---|---|---|
| `wstoken` | string | yes |
| `wsfunction` | `core_webservice_get_site_info` | yes |
| `moodlewsrestformat` | `json` | yes |

**Response (key fields)**
```json
{
  "sitename": "string",
  "username": "string",
  "fullname": "string",
  "userid": 0,
  "siteurl": "string",
  "userpictureurl": "string",
  "functions": [
    { "name": "string", "version": "string" }
  ]
}
```
`userid` is required as input for several other calls (e.g. `core_enrol_get_users_courses`).

---

## `core_enrol_get_users_courses`
Returns the list of courses the given user is enrolled in.

**Input**
| Param | Type | Required |
|---|---|---|
| `userid` | int | yes |

**Response**: array of course objects — key fields include `id`, `fullname`, `shortname`, `startdate`, `enddate`, `progress`, `lastaccess`. The `id` field is what's passed into `courseid`/`courseids[]` on every other course-scoped call below.

---

## `core_course_get_contents`
Returns the full section → module tree for a course, including files.

**Input**
| Param | Type | Required |
|---|---|---|
| `courseid` | int | yes |

**Response**: array of sections, each with:
```json
{
  "id": 92526,
  "name": "Unit 1",
  "visible": 1,
  "section": 1,
  "uservisible": true,
  "modules": [
    {
      "id": 112126,
      "url": "https://.../mod/resource/view.php?id=112126",
      "name": "Unit 1 ppt",
      "modname": "resource",
      "purpose": "content",
      "downloadcontent": 1,
      "contents": [
        {
          "type": "file",
          "filename": "Unit 1 PPT.pptx",
          "filesize": 7216318,
          "fileurl": "https://.../webservice/pluginfile.php/452096/mod_resource/content/1/Unit%201%20PPT.pptx?forcedownload=1",
          "mimetype": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "timemodified": 1783879327
        }
      ],
      "contentsinfo": {
        "filescount": 1,
        "filessize": 7216318,
        "mimetypes": ["application/..."]
      }
    }
  ]
}
```

**Key `modname` values observed**: `resource` (file), `forum` (announcements/discussion), `assign` (assignment) — each may or may not have a `contents` array depending on type. Empty sections return `"modules": []`.

**⚠️ File access note**: `fileurl` values point to `/webservice/pluginfile.php/...` — these are **not directly browsable**, even while logged into Moodle in a browser. They require the token appended as a query param:
```
https://.../webservice/pluginfile.php/452096/mod_resource/content/1/Unit%201%20PPT.pptx?forcedownload=1&token=YOUR_WSTOKEN
```
If the `fileurl` has no existing query string, use `?token=` instead of `&token=`. This applies to every file URL returned by any function (course contents, submission attachments, intro attachments, etc.) — the web service token is required regardless of browser session state, since `pluginfile.php` under `/webservice/` validates against `wstoken`, not session cookies.

---

## `mod_assign_get_assignments`
Returns assignment details across one or more courses in a single call.

**Input**
| Param | Type | Required |
|---|---|---|
| `courseids[0]`, `courseids[1]`, ... | int | yes (at least one) |

**Response**
```json
{
  "courses": [
    {
      "id": 5366,
      "fullname": "string",
      "assignments": [
        {
          "id": 11911,
          "cmid": 113489,
          "course": 5366,
          "name": "Assignment 1 - Phases of Compiler",
          "duedate": 1784917740,
          "allowsubmissionsfromdate": 1784745000,
          "cutoffdate": 0,
          "gradingduedate": 1785954600,
          "grade": 10,
          "intro": "<p>HTML description</p>",
          "introattachments": [],
          "teamsubmission": 0,
          "maxattempts": -1,
          "configs": [
            { "plugin": "file", "subtype": "assignsubmission", "name": "maxfilesubmissions", "value": "20" },
            { "plugin": "file", "subtype": "assignsubmission", "name": "maxsubmissionsizebytes", "value": "1073741824" }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```

**Notes**
- `id` is the assignment ID (needed for `mod_assign_get_submission_status`, `mod_assign_save_submission`) — distinct from `cmid` (course module ID, matches the `id` field in `core_course_get_contents`'s module entries, used for building direct Moodle URLs).
- `duedate`, `allowsubmissionsfromdate`, `cutoffdate`, `gradingduedate` are Unix timestamps. `cutoffdate: 0` means no hard cutoff is set.
- `configs` array includes per-plugin settings like max file count/size for submissions — useful for client-side validation before attempting upload.
- `intro` is raw HTML — sanitize before rendering.

---

## `mod_assign_get_submission_status`
Returns the current user's submission/grading status for a single assignment.

**Input**
| Param | Type | Required |
|---|---|---|
| `assignid` | int | yes — this is the assignment `id`, not `cmid` |

**Response (when a file submission exists)**
```json
{
  "lastattempt": {
    "submission": {
      "id": 491873,
      "userid": 36064,
      "attemptnumber": 0,
      "timecreated": 1785260580,
      "timemodified": 1785261361,
      "status": "submitted",
      "assignment": 10748,
      "latest": 1,
      "plugins": [
        {
          "type": "file",
          "name": "File submissions",
          "fileareas": [
            {
              "area": "submission_files",
              "files": [
                {
                  "filename": "My SQL Practice.docx",
                  "filepath": "/",
                  "filesize": 14978,
                  "fileurl": "https://hselearning.sriher.com/webservice/pluginfile.php/443316/assignsubmission_file/submission_files/491873/My%20SQL%20Practice.docx",
                  "timemodified": 1785261360,
                  "mimetype": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  "isexternalfile": false,
                  "icon": "f/document"
                }
              ]
            }
          ]
        },
        {
          "type": "comments",
          "name": "Submission comments"
        }
      ]
    },
    "submissionsenabled": true,
    "locked": false,
    "graded": false,
    "canedit": true,
    "caneditowner": true,
    "cansubmit": false,
    "extensionduedate": null,
    "gradingstatus": "notgraded",
    "usergroups": []
  },
  "assignmentdata": {
    "attachments": {
      "intro": []
    }
  },
  "warnings": []
}
```

**Notes**
- `gradingstatus` values to expect: `"notgraded"`, `"graded"`.
- If no submission exists, `lastattempt.submission` will be missing (and `"cansubmit"` might be false if `allowsubmissionsfromdate` is not yet reached).
- The `lastattempt.submission` object is present when a submission exists. It contains `plugins` (file/text submission content) and `status` (`"draft"`/`"submitted"`).
- Use this endpoint right after any `mod_assign_save_submission` call to verify the write actually succeeded — treat this as the source of truth over the save call's own response.

---

## `mod_assign_save_submission`
Saves a student's submission for an assignment (e.g. attaching files uploaded to the draft area).

**Input**
| Param | Type | Required | Notes |
|---|---|---|---|
| `assignmentid` | int | yes | **Note:** this is `assignmentid`, not `assignid` as used in the status endpoint! |
| `plugindata[files_filemanager]` | int | yes (for files) | The `itemid` returned from `/webservice/upload.php` |

**Response**
* `200 OK` with an empty body on success.
* Use `mod_assign_get_submission_status` immediately after to verify the submission was recorded.

---

## Endpoints planned but not yet tested
- `core_calendar_get_calendar_events` — deadline aggregation
- `gradereport_user_get_grades_table` — grades
- `mod_assign_get_submissions` — submission records (admin/teacher-style view; may return limited data as a student)
- `mod_forum_get_forums_by_courses` + discussion-fetching function — announcements
