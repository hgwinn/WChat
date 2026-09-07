import {

    auth,
    db,
    storage,

    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,

    doc,
    getDoc,
    setDoc,
    updateDoc,

    collection,
    query,
    where,
    getDocs,
    addDoc,
    orderBy,
    onSnapshot,

    serverTimestamp,
    runTransaction,

    ref,
    uploadBytesResumable,
    getDownloadURL

} from "./firebase.js";


/* =================================================
   STATE
================================================= */

let currentUser = null;

let selectedUser = null;

let unsubscribeMessages = null;

let unsubscribeUser = null;


/* =================================================
   DOM
================================================= */

const $ = id => document.getElementById(id);


/* =================================================
   LOADING
================================================= */

let progress = 0;

const loadingTimer = setInterval(() => {

    progress += Math.floor(Math.random() * 6) + 2;

    if (progress >= 100) {

        progress = 100;

        clearInterval(loadingTimer);

    }

    const bar = $("progress");

    const percent = $("percent");

    if (bar)
        bar.style.width = progress + "%";

    if (percent)
        percent.textContent = progress + "%";

}, 60);


/* =================================================
   FIREBASE AUTH STATE
================================================= */

onAuthStateChanged(auth, async firebaseUser => {

    setTimeout(async () => {

        $("loading").style.display = "none";

        if (!firebaseUser) {

            $("auth").style.display = "flex";

            $("setup").style.display = "none";

            $("app").style.display = "none";

            return;

        }

        try {

            const userRef =
                doc(db, "users", firebaseUser.uid);

            const snap =
                await getDoc(userRef);

            if (!snap.exists()) {

                $("auth").style.display = "none";

                $("setup").style.display = "flex";

                return;

            }

            currentUser = {

                uid: firebaseUser.uid,

                ...snap.data()

            };

            if (
                !currentUser.userId ||
                !currentUser.displayName
            ) {

                $("auth").style.display = "none";

                $("setup").style.display = "flex";

            } else {

                openApp();

            }

        } catch (error) {

            console.error(error);

            alert(
                "Không thể tải dữ liệu WChat: " +
                error.message
            );

        }

    }, 300);

});


/* =================================================
   LOGIN / REGISTER PAGE
================================================= */

window.showRegister = function () {

    $("loginPage").style.display = "none";

    $("registerPage").style.display = "block";

};


window.showLogin = function () {

    $("registerPage").style.display = "none";

    $("loginPage").style.display = "block";

};


/* =================================================
   USERNAME → EMAIL NỘI BỘ
================================================= */

function makeEmail(username) {

    return (
        username
            .toLowerCase()
            .replace(/[^a-z0-9._-]/g, "") +
        "@wchat.local"
    );

}


/* =================================================
   REGISTER
================================================= */

window.register = async function () {

    const username =
        $("regUsername")
            .value
            .trim()
            .toLowerCase();

    const password =
        $("regPassword").value;

    const password2 =
        $("regPassword2").value;

    const error =
        $("registerError");

    error.style.display = "none";

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {

        error.textContent =
            "Tên người dùng chỉ được dùng chữ, số và _";

        error.style.display = "block";

        return;

    }

    if (password.length < 6) {

        error.textContent =
            "Mật khẩu phải có ít nhất 6 ký tự";

        error.style.display = "block";

        return;

    }

    if (password !== password2) {

        error.textContent =
            "Mật khẩu xác nhận không khớp";

        error.style.display = "block";

        return;

    }

    try {

        /*
        Kiểm tra username trước.
        */

        const usernameRef =
            doc(
                db,
                "usernames",
                username
            );

        const usernameSnap =
            await getDoc(usernameRef);

        if (usernameSnap.exists()) {

            error.textContent =
                "Tên người dùng này đã được sử dụng";

            error.style.display = "block";

            return;

        }


        /*
        Firebase Authentication
        */

        const email =
            makeEmail(username);

        const result =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        const uid =
            result.user.uid;


        /*
        Lưu user
        */

        await setDoc(
            doc(db, "users", uid),
            {

                uid: uid,

                username: username,

                usernameLower: username,

                userId: null,

                displayName: null,

                avatar: null,

                online: true,

                createdAt:
                    serverTimestamp()

            }
        );


        /*
        Index username
        */

        await setDoc(
            usernameRef,
            {

                uid: uid

            }
        );


        currentUser = {

            uid: uid,

            username: username,

            usernameLower: username,

            userId: null,

            displayName: null,

            avatar: null,

            online: true

        };


        $("auth").style.display = "none";

        $("setup").style.display = "flex";


    } catch (error) {

        console.error(error);

        errorHandler(
            $("registerError"),
            error
        );

    }

};


/* =================================================
   LOGIN
================================================= */

window.login = async function () {

    const username =
        $("loginUsername")
            .value
            .trim()
            .toLowerCase();

    const password =
        $("loginPassword").value;

    const error =
        $("loginError");

    error.style.display = "none";

    try {

        const usernameSnap =
            await getDoc(
                doc(
                    db,
                    "usernames",
                    username
                )
            );

        if (!usernameSnap.exists()) {

            error.textContent =
                "Tên người dùng hoặc mật khẩu không chính xác";

            error.style.display = "block";

            return;

        }

        const uid =
            usernameSnap.data().uid;

        const userSnap =
            await getDoc(
                doc(db, "users", uid)
            );

        if (!userSnap.exists()) {

            error.textContent =
                "Tài khoản không tồn tại";

            error.style.display = "block";

            return;

        }

        /*
        Username được chuyển thành
        email nội bộ của Firebase.
        */

        await signInWithEmailAndPassword(
            auth,
            makeEmail(username),
            password
        );


    } catch (err) {

        console.error(err);

        error.textContent =
            "Tên người dùng hoặc mật khẩu không chính xác";

        error.style.display = "block";

    }

};


/* =================================================
   SETUP ID
================================================= */

window.saveId = async function () {

    let id =
        $("userId")
            .value
            .trim()
            .toLowerCase();

    const error =
        $("idError");

    if (!id.startsWith("@"))
        id = "@" + id;

    if (!/^@[a-z0-9_]{3,20}$/.test(id)) {

        error.textContent =
            "ID chỉ được chứa chữ, số và _";

        error.style.display = "block";

        return;

    }

    try {

        const idRef =
            doc(
                db,
                "userIds",
                id.substring(1)
            );

        /*
        Transaction chống trùng ID.
        */

        await runTransaction(
            db,
            async transaction => {

                const snap =
                    await transaction.get(idRef);

                if (snap.exists()) {

                    throw new Error(
                        "ID_ALREADY_USED"
                    );

                }

                transaction.set(
                    idRef,
                    {

                        uid:
                            currentUser.uid

                    }
                );

            }
        );


        await updateDoc(
            doc(
                db,
                "users",
                currentUser.uid
            ),
            {

                userId: id

            }
        );


        currentUser.userId = id;

        error.style.display = "none";

        $("idStep").style.display = "none";

        $("displayStep").style.display = "block";


    } catch (err) {

        console.error(err);

        if (err.message === "ID_ALREADY_USED") {

            error.textContent =
                "ID này đã được sử dụng";

        } else {

            error.textContent =
                "Không thể lưu ID. Vui lòng thử lại.";

        }

        error.style.display = "block";

    }

};


/* =================================================
   DISPLAY NAME
================================================= */

window.finishSetup = async function () {

    const display =
        $("displayName")
            .value
            .trim();

    if (display.length < 2) {

        alert(
            "Tên hiển thị phải có ít nhất 2 ký tự."
        );

        return;

    }

    try {

        await updateDoc(
            doc(
                db,
                "users",
                currentUser.uid
            ),
            {

                displayName: display,

                online: true

            }
        );

        currentUser.displayName =
            display;

        openApp();

    } catch (err) {

        console.error(err);

        alert(
            "Không thể lưu tên hiển thị."
        );

    }

};


/* =================================================
   OPEN APP
================================================= */

function openApp() {

    $("auth").style.display = "none";

    $("setup").style.display = "none";

    $("app").style.display = "block";

    updateProfile();

    loadChats();

    setOnline(true);

}


/* =================================================
   PROFILE
================================================= */

function updateProfile() {

    const first =
        (currentUser.displayName || "?")
            .charAt(0)
            .toUpperCase();

    if ($("myAvatar"))
        $("myAvatar").textContent = first;

    if ($("myDisplay"))
        $("myDisplay").textContent =
            currentUser.displayName;

    if ($("myUsername"))
        $("myUsername").textContent =
            currentUser.userId ||
            "@" + currentUser.username;

    if ($("modalAvatar"))
        $("modalAvatar").textContent = first;

    if ($("modalDisplay"))
        $("modalDisplay").textContent =
            currentUser.displayName;

    if ($("modalUsername"))
        $("modalUsername").textContent =
            currentUser.userId ||
            "@" + currentUser.username;

}


/* =================================================
   ONLINE STATUS
================================================= */

async function setOnline(value) {

    if (!currentUser)
        return;

    try {

        await updateDoc(
            doc(
                db,
                "users",
                currentUser.uid
            ),
            {

                online: value,

                lastSeen:
                    serverTimestamp()

            }
        );

    } catch (err) {

        console.error(err);

    }

}

window.addEventListener(
    "beforeunload",
    () => {

        /*
        Không đảm bảo browser luôn gửi
        request trước khi đóng tab.
        */

        setOnline(false);

    }
);


/* =================================================
   CHAT ID
================================================= */

function conversationId(uid1, uid2) {

    return [uid1, uid2]
        .sort()
        .join("_");

}


/* =================================================
   SEND MESSAGE
================================================= */

window.sendMessage = async function () {

    if (!selectedUser)
        return;

    const input =
        $("messageInput");

    const text =
        input.value.trim();

    if (!text)
        return;

    try {

        const conversation =
            conversationId(
                currentUser.uid,
                selectedUser.uid
            );

        const conversationRef =
            doc(
                db,
                "conversations",
                conversation
            );


        /*
        Tạo conversation nếu chưa có.
        */

        const snap =
            await getDoc(
                conversationRef
            );

        if (!snap.exists()) {

            await setDoc(
                conversationRef,
                {

                    members: [
                        currentUser.uid,
                        selectedUser.uid
                    ],

                    lastMessage: text,

                    updatedAt:
                        serverTimestamp()

                }
            );

        } else {

            await updateDoc(
                conversationRef,
                {

                    lastMessage: text,

                    updatedAt:
                        serverTimestamp()

                }
            );

        }


        await addDoc(
            collection(
                db,
                "conversations",
                conversation,
                "messages"
            ),
            {

                senderId:
                    currentUser.uid,

                receiverId:
                    selectedUser.uid,

                text: text,

                type: "text",

                createdAt:
                    serverTimestamp()

            }
        );


        input.value = "";


    } catch (err) {

        console.error(err);

        alert(
            "Không thể gửi tin nhắn: " +
            err.message
        );

    }

};


/* =================================================
   OPEN CONVERSATION
================================================= */

async function openConversation(user) {

    selectedUser = user;

    $("topName").textContent =
        user.displayName;

    $("topStatus").textContent =
        user.online
            ? "● Đang hoạt động"
            : "● Ngoại tuyến";


    $("topAvatar").textContent =
        user.displayName
            .charAt(0)
            .toUpperCase();


    if (unsubscribeMessages) {

        unsubscribeMessages();

        unsubscribeMessages = null;

    }


    const conversation =
        conversationId(
            currentUser.uid,
            user.uid
        );


    const messagesRef =
        collection(
            db,
            "conversations",
            conversation,
            "messages"
        );


    const q =
        query(
            messagesRef,
            orderBy(
                "createdAt",
                "asc"
            )
        );


    unsubscribeMessages =
        onSnapshot(
            q,
            snapshot => {

                const box =
                    $("messages");

                box.innerHTML = "";


                if (snapshot.empty) {

                    box.innerHTML = `

                        <div class="emptyChat">

                            <div class="big">
                                👋
                            </div>

                            <h2>
                                Bắt đầu trò chuyện
                            </h2>

                            <p>
                                Gửi tin nhắn đầu tiên cho
                                ${escapeHTML(
                                    user.displayName
                                )}
                            </p>

                        </div>

                    `;

                    return;

                }


                snapshot.forEach(messageDoc => {

                    const message =
                        messageDoc.data();

                    renderMessage(
                        message
                    );

                });


                box.scrollTop =
                    box.scrollHeight;

            },

            error => {

                console.error(error);

            }
        );

}


/* =================================================
   RENDER MESSAGE
================================================= */

function renderMessage(message) {

    const box =
        $("messages");

    const div =
        document.createElement("div");

    div.className =
        "message " +
        (
            message.senderId ===
            currentUser.uid
                ? "mine"
                : ""
        );


    const time =
        message.createdAt
            ? message.createdAt
                .toDate()
                .toLocaleTimeString(
                    "vi-VN",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )
            : "";


    if (message.type === "file") {

        div.innerHTML = `

            <div>
                📎
                <b>
                    ${escapeHTML(
                        message.fileName
                    )}
                </b>
            </div>

            <div class="messageMeta">
                ${formatBytes(message.fileSize)}
                ${time}
            </div>

        `;

    } else {

        div.innerHTML = `

            ${escapeHTML(
                message.text || ""
            )}

            <div class="messageMeta">
                ${time}
            </div>

        `;

    }


    box.appendChild(div);

}


/* =================================================
   LOAD CHAT LIST
================================================= */

function loadChats() {

    const conversationsRef =
        collection(
            db,
            "conversations"
        );


    const q =
        query(
            conversationsRef,
            where(
                "members",
                "array-contains",
                currentUser.uid
            ),
            orderBy(
                "updatedAt",
                "desc"
            )
        );


    onSnapshot(
        q,
        async snapshot => {

            const list =
                $("chatList");

            list.innerHTML = "";


            if (snapshot.empty) {

                list.innerHTML = `

                    <div style="
                        padding:20px;
                        text-align:center;
                        color:#687386;
                        font-size:13px;
                    ">
                        Chưa có cuộc trò chuyện
                    </div>

                `;

                return;

            }


            for (
                const conversation
                of snapshot.docs
            ) {

                const data =
                    conversation.data();

                const otherUid =
                    data.members.find(
                        uid =>
                            uid !== currentUser.uid
                    );


                if (!otherUid)
                    continue;


                const userSnap =
                    await getDoc(
                        doc(
                            db,
                            "users",
                            otherUid
                        )
                    );


                if (!userSnap.exists())
                    continue;


                const user = {

                    uid: otherUid,

                    ...userSnap.data()

                };


                const div =
                    document.createElement(
                        "div"
                    );


                div.className =
                    "chat";


                div.innerHTML = `

                    <div class="avatar">

                        ${escapeHTML(
                            user.displayName
                                .charAt(0)
                                .toUpperCase()
                        )}

                    </div>

                    <div class="chatInfo">

                        <div class="chatName">

                            ${escapeHTML(
                                user.displayName
                            )}

                        </div>

                        <div class="chatPreview">

                            ${escapeHTML(
                                data.lastMessage ||
                                "Bắt đầu trò chuyện"
                            )}

                        </div>

                    </div>

                `;


                div.onclick =
                    () => openConversation(user);


                list.appendChild(div);

            }

        },

        error => {

            console.error(
                "Chat list:",
                error
            );

        }
    );

}


/* =================================================
   SEARCH USERS
================================================= */

window.searchUsers = async function () {

    const input =
        $("searchInput");

    const queryText =
        input.value
            .trim()
            .toLowerCase();


    const results =
        $("searchResults");


    if (!queryText) {

        results.style.display =
            "none";

        return;

    }


    try {

        let usersFound = [];


        /*
        Nếu nhập @ID
        */

        if (queryText.startsWith("@")) {

            const id =
                queryText.substring(1);


            const snap =
                await getDocs(
                    query(
                        collection(
                            db,
                            "users"
                        ),
                        where(
                            "userId",
                            "==",
                            "@" + id
                        )
                    )
                );


            snap.forEach(
                docSnap => {

                    if (
                        docSnap.id !==
                        currentUser.uid
                    ) {

                        usersFound.push({

                            uid:
                                docSnap.id,

                            ...docSnap.data()

                        });

                    }

                }
            );


        } else {

            const snap =
                await getDocs(
                    query(
                        collection(
                            db,
                            "users"
                        ),
                        where(
                            "usernameLower",
                            ">=",
                            queryText
                        ),
                        where(
                            "usernameLower",
                            "<=",
                            queryText + "\uf8ff"
                        )
                    )
                );


            snap.forEach(
                docSnap => {

                    if (
                        docSnap.id !==
                        currentUser.uid
                    ) {

                        usersFound.push({

                            uid:
                                docSnap.id,

                            ...docSnap.data()

                        });

                    }

                }
            );

        }


        results.innerHTML = "";


        if (!usersFound.length) {

            results.innerHTML = `

                <div style="
                    padding:15px;
                    color:#8993a5;
                ">
                    Không tìm thấy người dùng.
                </div>

            `;

        }


        usersFound.forEach(user => {

            const div =
                document.createElement(
                    "div"
                );

            div.className =
                "result";


            div.innerHTML = `

                <div class="avatar">

                    ${escapeHTML(
                        user.displayName
                            .charAt(0)
                            .toUpperCase()
                    )}

                </div>

                <div>

                    <b>
                        ${escapeHTML(
                            user.displayName
                        )}
                    </b>

                    <div style="
                        color:#8993a5;
                        font-size:12px;
                    ">

                        ${escapeHTML(
                            user.userId ||
                            "@" + user.username
                        )}

                    </div>

                </div>

            `;


            div.onclick = () => {

                openConversation(user);

                results.style.display =
                    "none";

                input.value = "";

            };


            results.appendChild(div);

        });


        results.style.display =
            "block";


    } catch (err) {

        console.error(err);

    }

};


/* =================================================
   FILE UPLOAD
================================================= */

window.sendFile = async function () {

    if (!selectedUser)
        return;


    const file =
        $("fileInput")
            .files[0];


    if (!file)
        return;


    const MAX =
        1024 * 1024 * 1024;


    if (file.size > MAX) {

        alert(
            "File vượt quá giới hạn 1 GB!"
        );

        return;

    }


    try {

        const conversation =
            conversationId(
                currentUser.uid,
                selectedUser.uid
            );


        const path =
            `chatFiles/${conversation}/${Date.now()}_${file.name}`;


        const storageRef =
            ref(
                storage,
                path
            );


        const upload =
            uploadBytesResumable(
                storageRef,
                file
            );


        upload.on(

            "state_changed",

            snapshot => {

                const percent =
                    (
                        snapshot.bytesTransferred /
                        snapshot.totalBytes
                    ) * 100;


                console.log(
                    "Upload:",
                    percent.toFixed(1) + "%"
                );

            },

            error => {

                console.error(error);

                alert(
                    "Upload thất bại."
                );

            },

            async () => {

                const url =
                    await getDownloadURL(
                        upload.snapshot.ref
                    );


                await addDoc(
                    collection(
                        db,
                        "conversations",
                        conversation,
                        "messages"
                    ),
                    {

                        senderId:
                            currentUser.uid,

                        receiverId:
                            selectedUser.uid,

                        type:
                            "file",

                        fileName:
                            file.name,

                        fileSize:
                            file.size,

                        fileUrl:
                            url,

                        createdAt:
                            serverTimestamp()

                    }
                );

            }

        );


    } catch (err) {

        console.error(err);

        alert(
            "Không thể gửi file."
        );

    }


    $("fileInput").value = "";

};


/* =================================================
   PROFILE
================================================= */

window.openProfile = function () {

    $("profileModal")
        .style.display = "flex";

};


window.openChatInfo = function () {

    if (!selectedUser)
        return;

    $("chatInfoModal")
        .style.display = "flex";

};


window.closeModal = function (id) {

    $(id).style.display =
        "none";

};


/* =================================================
   LOGOUT
================================================= */

window.logout = async function () {

    try {

        await setOnline(false);

        await signOut(auth);

    } catch (err) {

        console.error(err);

    }

};


/* =================================================
   CALL UI
================================================= */

window.startCall = function (type) {

    if (!selectedUser) {

        alert(
            "Hãy chọn một cuộc trò chuyện trước."
        );

        return;

    }


    $("callScreen")
        .style.display = "flex";


    $("callName")
        .textContent =
            selectedUser.displayName;


    $("callAvatar")
        .textContent =
            selectedUser.displayName
                .charAt(0)
                .toUpperCase();


    $("callStatus")
        .textContent =
            type === "video"
                ? "Đang bắt đầu cuộc gọi video..."
                : "Đang gọi thoại...";

};


window.endCall = function () {

    $("callScreen")
        .style.display = "none";

};


/* =================================================
   EMOJI
================================================= */

window.addEmoji = function () {

    const input =
        $("messageInput");

    input.value += " 😊";

    input.focus();

};


/* =================================================
   ENTER
================================================= */

window.handleEnter = function (event) {

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        window.sendMessage();

    }

};


/* =================================================
   HELPERS
================================================= */

function escapeHTML(text) {

    return String(text || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function formatBytes(bytes) {

    if (!bytes)
        return "0 Bytes";

    const sizes =
        [
            "Bytes",
            "KB",
            "MB",
            "GB"
        ];

    const i =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );

    return (
        bytes /
        Math.pow(1024, i)
    ).toFixed(2)
    + " "
    + sizes[i];

}


function errorHandler(element, error) {

    let message =
        "Đã xảy ra lỗi.";

    if (
        error.code ===
        "auth/email-already-in-use"
    ) {

        message =
            "Tên người dùng này đã được sử dụng.";

    }

    if (
        error.code ===
        "auth/weak-password"
    ) {

        message =
            "Mật khẩu quá yếu.";

    }

    if (
        error.code ===
        "auth/network-request-failed"
    ) {

        message =
            "Không có kết nối Internet.";

    }

    element.textContent =
        message;

    element.style.display =
        "block";

}
