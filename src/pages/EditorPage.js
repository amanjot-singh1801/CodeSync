import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import { useLocation, useNavigate, Navigate, useParams, Link } from 'react-router-dom';
import Modal from '../components/Modal';
import { saveCode, updateCode } from '../Services/operations/codeAPI';


const EditorPage = () => {


    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [titleModal, setTitleModal] = useState(false); // Modal state
    const [projectId,setProjectId] = useState(JSON.parse(localStorage.getItem("projectId") || null));
    const [projectTitle,setProjectTitle] = useState("");
    const [shouldSave, setShouldSave] = useState(false);
    const [initialCode, setInitialCode] = useState(location.state?.project?.code || "");
    const [username,setUserName] = useState(location.state?.username || "");
    const token = JSON.parse(localStorage.getItem('token'));
    console.log("MY token is : ",token);
    useEffect(() => {
        codeRef.current = initialCode;

        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/home');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // Listening for joined event
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username: joinedUsername, socketId }) => {
                    if (joinedUsername !== location.state?.username) {
                        toast.success(`${joinedUsername} joined the room.`);
                        console.log(`${joinedUsername} joined`);
                    }
                    // Set the clients state with their individual usernames
                    setClients(clients);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                }
            );

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );
        };
        init();
        return () => {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
        };
    }, []);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        localStorage.removeItem("projectId");
        reactNavigator('/home');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    function handleSaveBtn(){

        if(!projectTitle && !projectId){
            console.log("Opening Modal");
            setTitleModal(true);
            setShouldSave(true);
        }else{  

            const code = codeRef.current;
            console.log("Code to save:", code);
            console.log("projectId : ",projectId);
            updateCode(code, projectId, token).then((response) => {
                console.log("Update Code Response:", response);
            }).catch(error => {
                console.error("Error updating code:", error);
            });
        }
       
    }

    useEffect(() => {
        // Trigger saveCode when projectTitle is updated and shouldSave is true
        if (shouldSave && projectTitle) {

            if(codeRef.current === ""){
                toast.error("Please Write something to save ");
                return;
            }
            const title = projectTitle;
            const code = codeRef.current;
            saveCode(title, code, token).then( (response)=>{
                setProjectId(response.data.projectId);
            })
            setShouldSave(false); // Reset flag after saving
        }
        // get the Id from backend and also put in localStorage and 
        // NOTE: when ever any user click on the saved code then make sure on that time put that id on localStorage this is very important point
    }, [projectTitle,shouldSave]);

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/logo.png"
                            alt="logo"
                        />
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username} // Pass each client's username individually
                            />
                        ))}
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>

            <div className="editorWrap">
                <Editor
                    socketRef={socketRef}
                    roomId={roomId}
                    onCodeChange={(code) => {
                        codeRef.current = code;
                    }}
                />
                <button
                    className="fixed top-4 right-8 rounded-md bg-green-600 px-4 py-2 font-medium hover:bg-green-800 transition-all cursor-pointer"
                    onClick={() => handleSaveBtn()}
                >
                    Save
                </button>
            </div>
            {
                titleModal && <Modal closeModal={() => setTitleModal(false)} setProjectTitle={setProjectTitle} code={codeRef.current} />
            }
        </div>
    );
};

export default EditorPage;
