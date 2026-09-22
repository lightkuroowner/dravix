let copy_paste_file = null;
const maxFileSize = getMaxFileSize();
var conversionMode = "single";
var req_key = "";
var req_key_2 = "";
const scriptsToLoad = [
    {
        src: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.min.js",
    },
    {
        src: "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.2/mammoth.browser.min.js",
    },
    {
        src: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.70/pdfmake.min.js",
    },
    {
        src: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.70/vfs_fonts.js",
    },
    {
        src: "https://cdn.jsdelivr.net/npm/html-to-pdfmake/browser.min.js",
    },
];

$(document).ready(function () {
    document.addEventListener("dragenter", function (e) {
        $(".upload-section").addClass("dragover");
    });

    document.addEventListener("dragleave", function (e) {
        if (e.target === document || e.target === document.body) {
            $(".upload-section").removeClass("dragover");
        }
    });

    loadScriptsDynamically(scriptsToLoad);
    tinymce.init({
        selector: "#editor",
        element_format: "html",
        menubar: false,
        mobile: {
            toolbar_mode: 'sliding',
            resize: true,
            height: 350,
            min_height: 350,
        },
        relative_urls: true,
        convert_urls: false,
        paste_as_text: false,
        paste_data_images: false,
        placeholder: "Drag and drop file or write text",
        resize: true,
        height: 350,
        min_height: 350,
        setup: function (editor) {
            $("#uploads-btns").removeClass("d-none");

            // Enhanced function to check if editor is truly empty (including images)
            const isEditorEmpty = (editor) => {
                const textContent = editor
                    .getContent({ format: "text" })
                    .trim();
                const htmlContent = editor.getContent().trim();

                // Check for images, tables, or other media content
                const bodyElement = editor.getBody();
                const hasImages = bodyElement.querySelector("img") !== null;
                const hasTables = bodyElement.querySelector("table") !== null;
                const hasMedia =
                    bodyElement.querySelector("video, audio, iframe") !== null;
                const hasOtherElements =
                    bodyElement.querySelector("hr, canvas, svg") !== null;

                // If there are non-text elements, editor is not empty
                if (hasImages || hasTables || hasMedia || hasOtherElements) {
                    return false;
                }

                // Check for completely empty or just whitespace/empty tags
                const isEmpty =
                    !textContent ||
                    htmlContent === "" ||
                    htmlContent === "<p></p>" ||
                    htmlContent === "<p><br></p>" ||
                    htmlContent === "<p>&nbsp;</p>" ||
                    /^<p[^>]*>(\s|&nbsp;|<br[^>]*>)*<\/p>$/.test(htmlContent);

                return isEmpty;
            };

            const toggleBeforeUpload = () => {
                setTimeout(() => {
                    if (isEditorEmpty(editor)) {
                        $(".before-upload").removeClass("d-none");
                    } else {
                        $(".before-upload").addClass("d-none");
                    }
                }, 10);
            };

            editor.on("init", (e) => {
                $("#uploads-btns").removeClass("d-none");
                $(".before-upload").removeClass("d-none");
                const css = `.mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { z-index: -1; }`;
                editor.dom.addStyle(css);
                const observer = new MutationObserver(handleMutations);
                observer.observe(document.body, { childList: true, subtree: true });

                editor.on("wordcountupdate", function (e) {
                    const wordCount = e.wordCount;
                    const imageCount = editor.getBody().querySelectorAll("img").length;
                    const tableCount = editor.getBody().querySelectorAll("table").length;
                    const textContent = editor.getBody().innerText.trim();
                    const hasContent = textContent.length > 0 || imageCount > 0 || tableCount > 0;
                    let statusText = `Words: ${wordCount.words} | Characters: ${wordCount.characters}`;
                    if (imageCount > 0) statusText += ` | Images: ${imageCount}`;
                    if (tableCount > 0) statusText += ` | Tables: ${tableCount}`;

                    $(".tox-statusbar__wordcount").text(statusText);
                    if (hasContent) {
                        $(".before-upload").addClass("d-none");
                    } else {
                        $(".before-upload").removeClass("d-none");
                    }
                });
            });

            editor.on("paste", (e) => {
                let clipboardData = e.clipboardData || window.clipboardData;
                let items = clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") !== -1) {
                        e.preventDefault();
                        return false;
                    }
                }
            });

            // custom paste button
            $(".paste-btn").on("click", async () => {
                if (navigator.clipboard && navigator.clipboard.readText) {

                    try {
                        let text = await navigator.clipboard.readText();
                        let html = text.replaceAll("\n", "<br>");
                        set_tinymce_content(html);
                    } catch (error) {
                        console.log(error);
                    }
                } else {
                    alert("Clipboard access is not supported in this browser or context");
                }
            });

            editor.on("input change keyup", (e) => toggleBeforeUpload());

            editor.on("drop", (e) => {
                e.stopPropagation();
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                readFile(file);
                $(".upload-section").removeClass("dragover");
                setTimeout(() => toggleBeforeUpload(), 100);
            });

            editor.on("change", (e) => {
                if ($(".before-convert").hasClass("d-none")) {
                    resetTool();
                }
            });

            editor.on("ExecCommand", function (e) {
                if (e.command === "Undo" || e.command === "Redo") toggleBeforeUpload();
            });

            editor.on("NodeChange", (e) => toggleBeforeUpload());

            editor.on("LoadContent", (e) => setTimeout(() => toggleBeforeUpload(), 50));
        },
        plugins: [
            "advlist",
            "autolink",
            "lists",
            "link",
            "anchor",
            "fullscreen",
            "wordcount",
            "save",
            "image", // Add image plugin if not already present
        ],
        toolbar:
            "undo redo | blocks | " +
            "bold italic | alignleft aligncenter " +
            "alignright alignjustify | bullist numlist outdent indent | " +
            "removeformat cancel",
        save_oncancelcallback: () => {
            resetTool();
            setTimeout(() => $(".before-upload").removeClass("d-none"), 50);
        },
        content_style: "body { font-family:Helvetica,Arial,sans-serif; font-size:14px;}",
    });

    $("#file").on("change", onChangeTextToPdfFile);
    $(".upload-section,.before-upload").on("drop", onDropFileTextToPDF);
    $("#convert").on("click", function (e) {
        const html = get_tinymce_content("html");
        if (html.trim() == "") {
            $(".modal").hide();
            showNoTextModal("No Text Found", "Please Enter some text");
            return false;
        }

        if (typeof with_cloudflare_captcha === "function") {
            with_cloudflare_captcha(false, Date.now() / 1000, captchaVerify, "light", "#cloudflare_container", null);
        } else {
            captchaVerify(null, null);
        }
    });
    $(".reset-btn").on("click", onResetTextToPDF);
});

const handleMutations = (mutationsList, observer) => {
    for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
            Array.from(mutation.addedNodes).forEach((node) => {
                if (node instanceof HTMLElement && node.matches(".tox-notifications-container")) {
                    document.querySelectorAll(".tox-notifications-container").forEach((el) => el.style.removeProperty("display"));
                    observer.disconnect();
                }
            });
        }
    }
};
const onChangeTextToPdfFile = (e) => {
    let file = e.originalEvent.target.files[0];
    readFile(file);
    $(e.target).val("");
};

const onDropFileTextToPDF = (e) => {
    e.stopPropagation();
    e.preventDefault();
    var file = e.originalEvent.dataTransfer.files[0];
    readFile(file);
    $(e.target).val("");
};
const captchaVerify = (captcha_1, captcha_2) => {
    $.ajaxSetup({
        headers: {
            "X-CSRF-TOKEN": $('meta[name="_token"]').attr("content")
        },
    });
    $.ajax({
        type: "POST",
        url: BASE_URL + "emd/captcha-verify/" + Date.now(),
        data: {
            emd_captcha_1: captcha_1,
            emd_captcha_2: captcha_2,
            emd_captcha_3: (Date.now() / 1000),
            emd_is_tool_premium: IS_TOOL_PREMIUM
        },
        success: function (response) {
            if (response.request) {
                req_key = response.req_key;
                req_key_2 = response.req_key;
                const editor = tinymce.get("editor");
                const editorContent = editor.getContent({ format: "html" });
                const blob = new Blob([editorContent], { type: "text/html" });
                const file = new File([blob], "converted_text.html", { type: "text/html" });
                ajaxCallFunctionTextToPDF(file);
            } else {
                alert('Invalid Captcha!')
            }
        }
    });
}

function ajaxCallFunctionTextToPDF(fileOrData) {
    let data;
    if (fileOrData instanceof FormData) {
        data = fileOrData;
    } else {
        data = new FormData();
        data.append("file", fileOrData);
        data.append("req_key", req_key);
        data.append("req_key_2", req_key_2);
        data.append("tool_name", "text-to-pdf");
        data.append("is_premium", IS_PREMIUM);
        data.append("parent_id", TOOL_ID);
        data.append("is_tool_premium", IS_TOOL_PREMIUM);
        data.append("e_track_key", getETrackKey());
        data.append("file_name", fileOrData.name);
        data.append("file_size_kb", (fileOrData.size / 1024).toFixed(2));
        data.append("file_type", fileOrData.type);
    }

    $("#convert").text(downloading_text).attr("disabled", true);

    $.ajax({
        type: "POST",
        url: BASE_URL + "text-to-pdf",
        data: data,
        processData: false,
        contentType: false,
        success: function (response) {
            if (response.ok) {
                req_key_2 = response.req_key_2;
                const link = document.createElement("a");
                link.href = response.text;
                link.download = (response.fileName || "Text-to-PDF") + ".pdf";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                $("#convert").text(convert_btn_text).attr("disabled", false);
                shouldShowTrustPilotPopup();

                if (!$(".review-stars").hasClass('feedback-visible')) {
                    if (!isFeedBackSubmitted) {
                        $(".review-stars").removeClass("d-none").addClass('feedback-visible');
                    }
                }
            } else {
                req_key_2 = response.req_key_2;
                onClickConvertBtn();
            }
        },
        error: function (xhr) {
            if (xhr.status !== 429) {
                onClickConvertBtn();
            } else {
                $("#convert").text(convert_btn_text).attr("disabled", false);
                showFileTypeModal(dailyLimitExceed, dailyLimitExceedDesc);
                $('.invalidImageModal').find('.try-another-btn').addClass('d-none');
            }
        }
    });
}

function onClickConvertBtn(e) {
    const html = get_tinymce_content("html");
    if (html.trim() == "") {
        $(".modal").hide();
        showNoTextModal("No Text Found", "Please Enter some text");
        return false;
    }
    $("#convert").text(converting_text);
    const contentSizeInBytes = new Blob([html], { type: "text/plain" }).size;
    const sizeInMb = parseFloat((contentSizeInBytes / 1048576).toFixed(2));
    if (sizeInMb > maxFileSize) {
        $(".modal").hide();
        showFileTypeModal(imageSizeForPremium, imageSizeTitleDesc);
        return false;
    }
    $("#convert").text(downloading_text);

    const container = document.createElement("div");
    container.innerHTML = html;
    const pdfContent = htmlToPdfmake(html, {
        defaultStyles: {
            // Headings (reduced margins)
            h1: { fontSize: 24, bold: true, margin: [0, 0, 0, 0] },
            h2: { fontSize: 20, bold: true, margin: [0, 0, 0, 0] },
            h3: { fontSize: 18, bold: true, margin: [0, 0, 0, 0] },
            h4: { fontSize: 16, bold: true, margin: [0, 0, 0, 0] },
            h5: { fontSize: 14, bold: true, margin: [0, 0, 0, 0] },
            h6: { fontSize: 12, bold: true, margin: [0, 0, 0, 0] },

            // Paragraphs & inline
            p: { fontSize: 12, margin: [0, 2, 0, 2] },
            strong: { bold: true },
            b: { bold: true },
            em: { italics: true },
            i: { italics: true },
            u: { decoration: 'underline' },
            s: { decoration: 'lineThrough' },
            sub: { fontSize: 8, baseline: -3 },
            sup: { fontSize: 8, baseline: 6 },
            code: { font: 'Courier', fontSize: 11, color: '#333333', background: '#f4f4f4' },

            // Blockquote
            blockquote: {
                italics: true,
                margin: [15, 4, 0, 4],
                color: '#555'
            },

            // Lists
            ul: { margin: [0, 2, 0, 2] },
            ol: { margin: [0, 2, 0, 2] },
            li: { margin: [0, 1, 0, 1] },

            // Tables
            table: { margin: [0, 3, 0, 8] },
            th: { bold: true, fillColor: '#eeeeee' },
            td: { margin: [2, 2, 2, 2] },

            // Links
            a: { color: 'blue', decoration: 'underline' },
        }
    });

    const setImageFit = (content, w = 515) => {
        content.forEach(item => {
            if (item.image) item.fit = [w, 1000];
            if (item.stack) setImageFit(item.stack, w);
            item.columns?.forEach(col => setImageFit([col], w));
            item.table?.body?.forEach(row => row.forEach(cell => setImageFit([cell], w)));
        });
    };

    setImageFit(pdfContent);
    const docDefinition = {
        content: pdfContent,
        defaultStyle: { font: "Roboto" },
        pageSize: "A4",
        pageOrientation: "portrait",
        // Reduced top margin from 60 → 40
        pageMargins: [40, 20, 40, 30],
    };

    pdfMake.createPdf(docDefinition).download("Text-to-PDF-" + generateRandomString(3) + ".pdf");
    shouldShowTrustPilotPopup();
    setTimeout(() => {
        $("#convert").text(convert_btn_text);
        if(!$(".review-stars").hasClass('feedback-visible')){
            if (!isFeedBackSubmitted) {
                $(".review-stars").removeClass("d-none").addClass('feedback-visible');
            }
        }
    }, 1500);
};

const resetTool = () => {
    $(".after-convert").addClass("d-none");
    $(".before-convert").removeClass("d-none");
    $(".download-btn").attr("href", "javascript:void(0)");
    $(".review-stars").addClass("d-none").removeClass('feedback-visible');

    const editor = tinyMCE.activeEditor;
    if (editor) {
        editor.setContent("");
        editor.undoManager.clear();
        editor.undoManager.add();
    }
    setTimeout(() => $(".before-upload").removeClass("d-none"), 10);
};
const onResetTextToPDF = () => {
    resetTool();
    set_tinymce_content("");
};

const get_tinymce_content = (format = "text") => {
    var text = "";
    try {
        if (format == "text") {
            text = tinymce.get("editor").getContent({ format });
        } else {
            text = tinymce.get("editor").getContent();
        }
    } catch (error) { }
    return text;
};

const set_tinymce_content = (content, type_ext = "") => {
    var edi = tinymce.get("editor");
    if (edi != undefined && edi != null && content != "") {
        if (type_ext == "txt") {
            const escaped = content
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n/g, "<br>");
            edi.setContent(escaped, { format: "html" });
        } else {
            edi.setContent(content, { format: "html" });
        }
        edi.undoManager.clear();
        edi.undoManager.add();
        edi.setDirty(true);
    }
};

const readFile = (file) => {
    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
    if (fileSize > 5) {
        $(".modal").hide();
        showFileTypeModal(imageSizeForPremium, imageSizeTitleDesc);
        return false;
    }
    var fileName = file.name;
    var fileExtension = fileName.substr(fileName.lastIndexOf(".") + 1);
    const allowedExtensions = ["txt", "pdf", "docx", "doc"];
    if (allowedExtensions.includes(fileExtension)) {
        getTextFromFile(file)
            .then((text) => {
                if (text.trim() == "") {
                    $(".modal").hide();
                    showNoTextModal("No Text Found", "Please Upload a different File");
                    return;
                }
                $(".before-upload").addClass("d-none");
                $(".upload-section").removeClass("dragover");
                set_tinymce_content(text, fileExtension);
            })
            .catch((error) => {
                if (error.message && error.message === "INVALID_FILE") {
                    showNoTextModal("Invalid File", "The selected file is not a valid format.");
                } else {
                    console.error("Error reading file:", error);
                }
            });
    } else {
        $(".modal").hide();
        showFileTypeModal(fileTypeNotAllowTitle, "Supported formats: TXT, DOCX, DOC, PDF");
    }
};
$(document).on('keydown', function (e) {
    if (e.key === 'Escape') {
        $('.invalidImageModal').find('.try-another-btn').removeClass('d-none');
    }
});
$(document).on('click', '.close_invalid_file', function (e) {
    $('.invalidImageModal').find('.try-another-btn').removeClass('d-none');
});