    function shouldShowTrustPilotPopup() {
        const popupClosed = getTrustPilotCookie(`popup_closed_${TOOL_ID}`);
        const popupClosedForever = getTrustPilotCookie(`popup_closed_forever_${TOOL_ID}`);
        const currentTime = new Date().getTime();
        const ONE_DAY = 24 * 60 * 60 * 1000;

        if (popupClosed && (currentTime - popupClosed < ONE_DAY)) {
            return;
        }
        if (popupClosedForever) {
            return;
        }

        const $popup = $('.trustpilot-popup');
        if($popup.css('display') == 'none') {
            $popup.css({ display: 'block', right: '-300px' })
                .animate({ right: '23px' }, 500);
        }
    }

    const setActionRecord = (reviewName, isClosed = false) =>{
        let closeOrClick = "Link";
        if(isClosed){
            closeOrClick = "Closed";
        }
        record_user_action(`${reviewName} ${closeOrClick}`,`${reviewName} ${closeOrClick}`, 2, TOOL_ID);
    }

    $('#close_trust_pilot').on('click', function () {
        $('.trustpilot-popup').animate({ right: '-300px' }, 500, function () {
            $(this).hide();
        });
        let review_name = "Trust Pilot";
        if($(this).data("id") == "G2"){
            review_name = "G2";
        }
        setActionRecord(review_name, true);        
        setTrustPilotCookie(`popup_closed_${TOOL_ID}`, new Date().getTime(), 7);
    });
    $('.trust_pilot_link').on('click', function () {
        $('.trustpilot-popup').remove();
        let review_name = "Trust Pilot";
        if($(this).attr("id") == "G2"){
           review_name = "G2";
        }
        setActionRecord(review_name)        
        setTrustPilotCookie(`popup_closed_forever_${TOOL_ID}`, new Date().getTime(), 10000);
    });
    function setTrustPilotCookie(name, value, days) {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = name + "=" + value + ";expires=" + d.toUTCString() + ";path=/";
    }

    function getTrustPilotCookie(name) {
        const nameEq = name + "=";
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let c = cookies[i].trim();
            if (c.indexOf(nameEq) === 0) {
                return c.substring(nameEq.length);
            }
        }
        return "";
    }